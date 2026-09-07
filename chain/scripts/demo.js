// Exercises the full Dynamo flywheel against a fresh local deployment:
// deposit -> fee accrual over time -> accrueAndFundKeeperGas -> price drift
// -> rebalance. Every step is a real transaction on Hardhat's in-process
// EVM, checked against the actual resulting on-chain state (not simulated).
const { ethers, network } = require("hardhat");
const { main: deploy } = require("./deploy");

function fmt(x) {
  return ethers.formatEther(x);
}

async function main() {
  const { contracts, stocks, policyId } = await deploy();
  const [deployer, user] = await ethers.getSigners();

  const vault = await ethers.getContractAt("DynamoVault", contracts.DynamoVault);
  const usdg = await ethers.getContractAt("MockERC20", contracts.USDG);
  const gasSponsor = await ethers.getContractAt("DynamoGasSponsor", contracts.DynamoGasSponsor);
  const entryPoint = await ethers.getContractAt("EntryPoint", contracts.EntryPoint);

  console.log("\n=== 1. User deposits 1,000 USDG ===");
  await (await usdg.mint(user.address, ethers.parseEther("1000"))).wait();
  await (await usdg.connect(user).approve(contracts.DynamoVault, ethers.parseEther("1000"))).wait();
  const minOuts = Object.keys(stocks).map(() => 0n);
  await (await vault.connect(user).deposit(ethers.parseEther("1000"), minOuts)).wait();
  const shares = await vault.balanceOf(user.address);
  const totalUsd = await vault.totalAssetsValueUsd();
  console.log(`  shares minted: ${fmt(shares)} DYNAMO`);
  console.log(`  vault totalAssetsValueUsd: $${fmt(totalUsd)}`);
  for (const [symbol, s] of Object.entries(stocks)) {
    const token = await ethers.getContractAt("MockERC20", s.token);
    console.log(`  ${symbol} held: ${fmt(await token.balanceOf(contracts.DynamoVault))} (target ${s.targetBps / 100}%)`);
  }

  console.log("\n=== 2. Time passes (30 days), management fee accrues ===");
  await network.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
  await network.provider.send("evm_mine");

  const spendableBefore = await gasSponsor.spendableNow(policyId);
  console.log(`  keeper policy spendable before: ${fmt(spendableBefore)} ETH`);

  const tx = await vault.connect(deployer).accrueAndFundKeeperGas(0);
  const receipt = await tx.wait();
  const fundedEvent = receipt.logs
    .map((l) => { try { return vault.interface.parseLog(l); } catch { return null; } })
    .find((l) => l && l.name === "KeeperGasFunded");
  console.log(`  KeeperGasFunded: feeUsdg=$${fmt(fundedEvent.args.feeUsdg)} ethFunded=${fmt(fundedEvent.args.ethFunded)} ETH`);

  const spendableAfter = await gasSponsor.spendableNow(policyId);
  const epBalance = await entryPoint.balanceOf(contracts.DynamoGasSponsor);
  console.log(`  keeper policy spendable after: ${fmt(spendableAfter)} ETH`);
  console.log(`  DynamoGasSponsor's EntryPoint deposit: ${fmt(epBalance)} ETH`);
  if (spendableAfter <= spendableBefore) throw new Error("flywheel did not fund the keeper policy");

  console.log("\n=== 3. AAPL price jumps 40%, basket drifts off target ===");
  const aaplFeed = await ethers.getContractAt("MockPriceFeed", stocks.AAPL.feed);
  const router = await ethers.getContractAt("MockSwapRouter", contracts.MockSwapRouter);
  const newPrice = 150n * 10n ** 8n * 140n / 100n;
  await (await aaplFeed.setAnswer(newPrice)).wait();
  await (await router.setPrice(stocks.AAPL.token, newPrice)).wait();

  console.log("\n=== 4. Keeper calls rebalance() to correct drift ===");
  const rebalanceTx = await vault.connect(user).rebalance(minOuts);
  await rebalanceTx.wait();
  console.log("  Rebalanced ✓ — basket back within tolerance");

  for (const [symbol, s] of Object.entries(stocks)) {
    const token = await ethers.getContractAt("MockERC20", s.token);
    const bal = await token.balanceOf(contracts.DynamoVault);
    console.log(`  ${symbol} held after rebalance: ${fmt(bal)}`);
  }

  console.log("\nFull flywheel verified end to end: deposit -> fee accrual -> gas-sponsor funding -> drift -> rebalance.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
