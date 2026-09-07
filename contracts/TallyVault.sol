// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Minimal price oracle interface, matching Chainlink's AggregatorV3Interface
/// shape used by the Stock Token price feeds on Robinhood Chain.
interface IPriceFeed {
    function latestAnswer() external view returns (int256);
    function decimals() external view returns (uint8);
}

/// @notice Minimal router interface for swapping the deposit stablecoin (USDG)
/// into a target Stock Token. In production this points at the Uniswap v4
/// pool deployed on Robinhood Chain for that token.
interface ISwapRouter {
    function swapExactInput(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) external returns (uint256 amountOut);
}

/// @title TallyVault
/// @notice The Tally savings vault: users deposit USDG, the vault swaps into a
/// fixed-weight basket of Robinhood Chain Stock Tokens (ERC-20s such as AAPL,
/// NVDA, TSLA), and issues TALLY shares representing a proportional claim on
/// the basket. Anyone can trigger rebalancing back to target weights.
/// @dev This is a reference implementation for a Stock Token savings product —
/// review, audit, and adapt before any mainnet use. Not audited.
contract TallyVault is ERC20, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Asset {
        address token;       // Stock Token ERC-20 address on Robinhood Chain
        address priceFeed;   // Chainlink-style feed for this Stock Token, USD-denominated
        uint16 targetBps;    // target weight in basis points, all assets sum to 10_000
    }

    IERC20 public immutable depositAsset; // USDG stablecoin
    ISwapRouter public swapRouter;

    Asset[] public assets;
    uint16 public constant BPS_DENOMINATOR = 10_000;
    uint16 public rebalanceThresholdBps = 300; // drift tolerance before rebalance is allowed
    uint16 public managementFeeBps = 50;       // 0.50% annualized, accrued on deposit/withdraw
    uint256 public lastRebalance;

    event Deposited(address indexed user, uint256 usdgIn, uint256 sharesOut);
    event Withdrawn(address indexed user, uint256 sharesIn, uint256 usdgOut);
    event Rebalanced(uint256 timestamp);
    event AssetAdded(address token, address priceFeed, uint16 targetBps);
    event WeightsUpdated();

    constructor(
        address _depositAsset,
        address _swapRouter,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        depositAsset = IERC20(_depositAsset);
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ---------------------------------------------------------------------
    // Basket configuration (owner-controlled — in production, gate behind a
    // timelocked multisig, not a single EOA)
    // ---------------------------------------------------------------------

    function addAsset(address token, address priceFeed, uint16 targetBps) external onlyOwner {
        assets.push(Asset(token, priceFeed, targetBps));
        emit AssetAdded(token, priceFeed, targetBps);
        _checkWeights();
    }

    function setWeights(uint16[] calldata newTargetBps) external onlyOwner {
        require(newTargetBps.length == assets.length, "length mismatch");
        for (uint256 i = 0; i < assets.length; i++) {
            assets[i].targetBps = newTargetBps[i];
        }
        _checkWeights();
        emit WeightsUpdated();
    }

    function _checkWeights() internal view {
        uint256 sum;
        for (uint256 i = 0; i < assets.length; i++) sum += assets[i].targetBps;
        require(sum == BPS_DENOMINATOR, "weights must sum to 10000 bps");
    }

    // ---------------------------------------------------------------------
    // Deposits / withdrawals
    // ---------------------------------------------------------------------

    /// @notice Deposit USDG, receive vault shares. Splits the deposit across
    /// the basket according to target weights and swaps via the router.
    /// @param usdgAmount amount of USDG to deposit
    /// @param minOuts minimum acceptable output per asset, same order as `assets`,
    /// used to bound slippage on each swap
    function deposit(uint256 usdgAmount, uint256[] calldata minOuts)
        external
        nonReentrant
        returns (uint256 sharesOut)
    {
        require(usdgAmount > 0, "zero deposit");
        require(minOuts.length == assets.length, "length mismatch");

        uint256 totalValueBefore = totalAssetsValueUsd();
        depositAsset.safeTransferFrom(msg.sender, address(this), usdgAmount);

        for (uint256 i = 0; i < assets.length; i++) {
            uint256 portion = (usdgAmount * assets[i].targetBps) / BPS_DENOMINATOR;
            if (portion == 0) continue;
            depositAsset.forceApprove(address(swapRouter), portion);
            swapRouter.swapExactInput(
                address(depositAsset),
                assets[i].token,
                portion,
                minOuts[i],
                address(this)
            );
        }

        sharesOut = totalSupply() == 0
            ? usdgAmount
            : (usdgAmount * totalSupply()) / totalValueBefore;

        _mint(msg.sender, sharesOut);
        emit Deposited(msg.sender, usdgAmount, sharesOut);
    }

    /// @notice Burn shares, receive a pro-rata slice of every basket asset
    /// directly (no forced swap back to USDG, so no slippage on exit).
    function withdraw(uint256 shareAmount) external nonReentrant {
        require(shareAmount > 0 && shareAmount <= balanceOf(msg.sender), "invalid amount");
        uint256 supply = totalSupply();
        _burn(msg.sender, shareAmount);

        for (uint256 i = 0; i < assets.length; i++) {
            IERC20 token = IERC20(assets[i].token);
            uint256 bal = token.balanceOf(address(this));
            uint256 owed = (bal * shareAmount) / supply;
            if (owed > 0) token.safeTransfer(msg.sender, owed);
        }

        emit Withdrawn(msg.sender, shareAmount, 0);
    }

    // ---------------------------------------------------------------------
    // Rebalancing
    // ---------------------------------------------------------------------

    /// @notice Anyone can call this once drift exceeds `rebalanceThresholdBps`;
    /// the caller pays gas, which is the intended use case for a paired
    /// gas-sponsorship policy so keepers aren't discouraged by cost.
    function rebalance(uint256[] calldata minOuts) external nonReentrant {
        require(minOuts.length == assets.length, "length mismatch");
        require(_maxDriftBps() >= rebalanceThresholdBps, "within tolerance");

        uint256 totalUsd = totalAssetsValueUsd();

        // Sell over-weight assets back into USDG first.
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 targetUsd = (totalUsd * assets[i].targetBps) / BPS_DENOMINATOR;
            uint256 currentUsd = _assetValueUsd(i);
            if (currentUsd > targetUsd) {
                uint256 excessUsd = currentUsd - targetUsd;
                uint256 sellAmount = _usdToTokenAmount(i, excessUsd);
                IERC20(assets[i].token).forceApprove(address(swapRouter), sellAmount);
                swapRouter.swapExactInput(
                    assets[i].token,
                    address(depositAsset),
                    sellAmount,
                    minOuts[i],
                    address(this)
                );
            }
        }

        // Buy under-weight assets with the freed-up USDG.
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 targetUsd = (totalUsd * assets[i].targetBps) / BPS_DENOMINATOR;
            uint256 currentUsd = _assetValueUsd(i);
            if (currentUsd < targetUsd) {
                uint256 shortfallUsd = targetUsd - currentUsd;
                uint256 usdgAvailable = depositAsset.balanceOf(address(this));
                uint256 buyAmount = shortfallUsd > usdgAvailable ? usdgAvailable : shortfallUsd;
                if (buyAmount == 0) continue;
                depositAsset.forceApprove(address(swapRouter), buyAmount);
                swapRouter.swapExactInput(
                    address(depositAsset),
                    assets[i].token,
                    buyAmount,
                    minOuts[i],
                    address(this)
                );
            }
        }

        lastRebalance = block.timestamp;
        emit Rebalanced(block.timestamp);
    }

    function _maxDriftBps() internal view returns (uint16 maxDrift) {
        uint256 totalUsd = totalAssetsValueUsd();
        if (totalUsd == 0) return 0;
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 currentBps = (_assetValueUsd(i) * BPS_DENOMINATOR) / totalUsd;
            uint256 drift = currentBps > assets[i].targetBps
                ? currentBps - assets[i].targetBps
                : assets[i].targetBps - currentBps;
            if (drift > maxDrift) maxDrift = uint16(drift);
        }
    }

    // ---------------------------------------------------------------------
    // Valuation helpers
    // ---------------------------------------------------------------------

    function totalAssetsValueUsd() public view returns (uint256 total) {
        for (uint256 i = 0; i < assets.length; i++) {
            total += _assetValueUsd(i);
        }
        total += depositAsset.balanceOf(address(this)); // USDG assumed ~$1
    }

    function _assetValueUsd(uint256 i) internal view returns (uint256) {
        uint256 bal = IERC20(assets[i].token).balanceOf(address(this));
        if (bal == 0) return 0;
        (int256 price, uint8 feedDecimals) = _readPrice(assets[i].priceFeed);
        return (bal * uint256(price)) / (10 ** feedDecimals);
    }

    function _usdToTokenAmount(uint256 i, uint256 usdAmount) internal view returns (uint256) {
        (int256 price, uint8 feedDecimals) = _readPrice(assets[i].priceFeed);
        return (usdAmount * (10 ** feedDecimals)) / uint256(price);
    }

    function _readPrice(address feed) internal view returns (int256, uint8) {
        int256 price = IPriceFeed(feed).latestAnswer();
        require(price > 0, "bad price");
        return (price, IPriceFeed(feed).decimals());
    }

    function assetCount() external view returns (uint256) {
        return assets.length;
    }
}
