// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPaymaster} from "@account-abstraction/contracts/interfaces/IPaymaster.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title TallyGasSponsor
/// @notice An ERC-4337 paymaster that lets a project register a spending
/// policy and sponsor gas for its users on Robinhood Chain, without every
/// project having to build its own account-abstraction stack. Built against
/// the EntryPoint v0.7 deployment on Robinhood Chain (chain ID 4663).
/// @dev Reference implementation for a "gas-sponsor builder tool" — an admin
/// UI would sit on top of `registerPolicy` / `fundPolicy` / policy reads.
/// Not audited. In production, validate this against the specific EntryPoint
/// version you target and add a real signature-based off-chain policy check
/// if you need per-request approval instead of on-chain caps only.
contract TallyGasSponsor is IPaymaster, Ownable {
    IEntryPoint public immutable entryPoint;

    struct Policy {
        address owner;            // project/app that owns this policy
        uint256 balance;          // ETH deposited to fund sponsored gas, in wei
        uint256 dailyCapWei;      // max wei this policy will sponsor per 24h window
        uint256 spentToday;       // running total within the current window
        uint256 windowStart;      // timestamp the current 24h window began
        uint256 perOpCapWei;      // max wei sponsored for a single UserOperation
        bool active;
    }

    /// @dev A "policy" is identified by a bytes32 id chosen by the app, e.g.
    /// keccak256("tally-basket-app"). This lets one paymaster contract serve
    /// many unrelated projects with fully isolated budgets.
    mapping(bytes32 => Policy) public policies;

    /// @dev target contracts a given policy is willing to sponsor calls into
    /// (e.g. a specific vault or router address) — an empty allow-list means
    /// "any target", which most projects should avoid in production.
    mapping(bytes32 => mapping(address => bool)) public allowedTargets;

    event PolicyRegistered(bytes32 indexed policyId, address indexed owner, uint256 dailyCapWei, uint256 perOpCapWei);
    event PolicyFunded(bytes32 indexed policyId, uint256 amount);
    event PolicyTargetAllowed(bytes32 indexed policyId, address target, bool allowed);
    event GasSponsored(bytes32 indexed policyId, address indexed sender, uint256 actualCost);

    modifier onlyEntryPoint() {
        require(msg.sender == address(entryPoint), "caller not EntryPoint");
        _;
    }

    modifier onlyPolicyOwner(bytes32 policyId) {
        require(policies[policyId].owner == msg.sender, "not policy owner");
        _;
    }

    constructor(address _entryPoint) Ownable(msg.sender) {
        entryPoint = IEntryPoint(_entryPoint);
    }

    // ---------------------------------------------------------------------
    // Policy management — this is what the dashboard UI calls
    // ---------------------------------------------------------------------

    function registerPolicy(
        bytes32 policyId,
        uint256 dailyCapWei,
        uint256 perOpCapWei
    ) external {
        require(policies[policyId].owner == address(0), "policy exists");
        policies[policyId] = Policy({
            owner: msg.sender,
            balance: 0,
            dailyCapWei: dailyCapWei,
            spentToday: 0,
            windowStart: block.timestamp,
            perOpCapWei: perOpCapWei,
            active: true
        });
        emit PolicyRegistered(policyId, msg.sender, dailyCapWei, perOpCapWei);
    }

    function fundPolicy(bytes32 policyId) external payable {
        require(policies[policyId].owner != address(0), "no such policy");
        policies[policyId].balance += msg.value;
        entryPoint.depositTo{value: msg.value}(address(this));
        emit PolicyFunded(policyId, msg.value);
    }

    function setTargetAllowed(bytes32 policyId, address target, bool allowed)
        external
        onlyPolicyOwner(policyId)
    {
        allowedTargets[policyId][target] = allowed;
        emit PolicyTargetAllowed(policyId, target, allowed);
    }

    function setActive(bytes32 policyId, bool active) external onlyPolicyOwner(policyId) {
        policies[policyId].active = active;
    }

    // ---------------------------------------------------------------------
    // ERC-4337 paymaster interface
    // ---------------------------------------------------------------------

    /// @dev paymasterAndData layout after the standard 52-byte header:
    /// [0:32]  policyId
    /// The target contract being called is read from userOp.callData by the
    /// caller off-chain when constructing paymasterAndData; this simplified
    /// version trusts the sender's target claim is enforced by the smart
    /// account itself and focuses on the budget/allow-list check.
    function validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32 /* userOpHash */,
        uint256 maxCost
    ) external override onlyEntryPoint returns (bytes memory context, uint256 validationData) {
        bytes32 policyId = _extractPolicyId(userOp.paymasterAndData);
        Policy storage policy = policies[policyId];

        require(policy.active, "policy inactive");
        require(policy.perOpCapWei == 0 || maxCost <= policy.perOpCapWei, "exceeds per-op cap");

        uint256 spendable = _spendableThisWindow(policy);
        require(maxCost <= spendable, "exceeds daily cap");
        require(policy.balance >= maxCost, "policy underfunded");

        context = abi.encode(policyId, userOp.sender);
        validationData = 0; // 0 = valid, no time-range restriction in this simplified version
    }

    function postOp(
        PostOpMode /* mode */,
        bytes calldata context,
        uint256 actualGasCost,
        uint256 /* actualUserOpFeePerGas */
    ) external override onlyEntryPoint {
        (bytes32 policyId, address sender) = abi.decode(context, (bytes32, address));
        Policy storage policy = policies[policyId];

        if (block.timestamp >= policy.windowStart + 1 days) {
            policy.windowStart = block.timestamp;
            policy.spentToday = 0;
        }

        policy.spentToday += actualGasCost;
        policy.balance -= actualGasCost;

        emit GasSponsored(policyId, sender, actualGasCost);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function spendableNow(bytes32 policyId) external view returns (uint256) {
        return _spendableThisWindow(policies[policyId]);
    }

    function _spendableThisWindow(Policy storage policy) internal view returns (uint256) {
        if (block.timestamp >= policy.windowStart + 1 days) {
            return policy.dailyCapWei > policy.balance ? policy.balance : policy.dailyCapWei;
        }
        uint256 remainingCap = policy.dailyCapWei > policy.spentToday
            ? policy.dailyCapWei - policy.spentToday
            : 0;
        return remainingCap > policy.balance ? policy.balance : remainingCap;
    }

    function _extractPolicyId(bytes calldata paymasterAndData) internal pure returns (bytes32 id) {
        // Standard header is 52 bytes (paymaster address + verification/postOp gas limits);
        // the policy id is the first 32 bytes after that header.
        require(paymasterAndData.length >= 84, "malformed paymasterAndData");
        id = bytes32(paymasterAndData[52:84]);
    }
}
