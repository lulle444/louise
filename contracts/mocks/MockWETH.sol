// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Minimal WETH9-style wrapper used as DynamoVault's `weth`
/// dependency in the testnet demo. Real ETH-backed: deposit() mints 1:1,
/// withdraw() burns 1:1 and returns ETH — so it satisfies the vault's
/// `IWETH` interface exactly as the real Robinhood Chain WETH would.
contract MockWETH is ERC20 {
    constructor() ERC20("Wrapped Ether (testnet)", "WETH") {}

    receive() external payable {
        deposit();
    }

    function deposit() public payable {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        _burn(msg.sender, amount);
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "ETH transfer failed");
    }
}
