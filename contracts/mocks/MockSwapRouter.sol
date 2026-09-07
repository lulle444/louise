// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IMintableERC20 {
    function mint(address to, uint256 amount) external;
}

interface IMockWETH {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

/// @notice Fixed-price swap stub standing in for the Uniswap v4 pools
/// DynamoVault routes through on Robinhood Chain. Owner sets a USD price
/// (1e8 fixed point, matching MockPriceFeed) per token; swaps settle at
/// that rate by minting the mock output token, except the WETH leg, which
/// is backed by real ETH the router holds so `IWETH.withdraw()` downstream
/// in the vault still works exactly as it would in production.
contract MockSwapRouter is Ownable {
    using SafeERC20 for IERC20;

    mapping(address => uint256) public usdPrice8;
    address public immutable weth;

    constructor(address _weth) Ownable(msg.sender) {
        weth = _weth;
    }

    receive() external payable {}

    function setPrice(address token, uint256 price8) external onlyOwner {
        usdPrice8[token] = price8;
    }

    function swapExactInput(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) external returns (uint256 amountOut) {
        require(usdPrice8[tokenIn] > 0 && usdPrice8[tokenOut] > 0, "price not set");
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        amountOut = (amountIn * usdPrice8[tokenIn]) / usdPrice8[tokenOut];
        require(amountOut >= minAmountOut, "slippage");

        if (tokenIn == weth) {
            IMockWETH(weth).withdraw(amountIn);
        }

        if (tokenOut == weth) {
            IMockWETH(weth).deposit{value: amountOut}();
            IERC20(weth).safeTransfer(recipient, amountOut);
        } else {
            IMintableERC20(tokenOut).mint(recipient, amountOut);
        }
    }
}
