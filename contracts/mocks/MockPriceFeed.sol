// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Chainlink-shaped price feed stub for the testnet demo. Matches
/// DynamoVault's `IPriceFeed` interface — owner pushes a price, everything
/// else reads it exactly as it would read a real AggregatorV3Interface feed.
contract MockPriceFeed is Ownable {
    int256 public latestAnswer;
    uint8 public immutable decimals;

    constructor(int256 initialAnswer, uint8 decimals_) Ownable(msg.sender) {
        latestAnswer = initialAnswer;
        decimals = decimals_;
    }

    function setAnswer(int256 answer) external onlyOwner {
        latestAnswer = answer;
    }
}
