// Deploys the full Dynamo stack: the real ERC-4337 EntryPoint (v0.7),
// DynamoGasSponsor, DynamoVault, and — on any network that isn't a real
// Robinhood Chain deployment — a set of testnet-only mocks standing in for
// USDG, WETH, Stock Tokens, price feeds, and the swap router.
//
// Usage:
//   npx hardhat run scripts/deploy.js                     (local, ephemeral)
//   npx hardhat run scripts/deploy.js --network sepolia    (real testnet)
//
// Writes the resulting addresses to chain/deployed.<network>.json.
const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

const STOCKS = [
  { symbol: "AAPL", name: "Apple Inc. (testnet)", price: 150, targetBps: 4000 },
  { symbol: "NVDA", name: "NVIDIA Corp. (testnet)", price: 900, targetBps: 3500 },
  { symbol: "TSLA", name: "Tesla Inc. (testnet)", price: 250, targetBps: 2500 },
];
const WETH_PRICE = 3200;
const USD8 = (n) => BigInt(n) * 10n ** 8n;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying to "${network.name}" as ${deployer.address}`);

  const MockWETH = await ethers.getContractFactory("MockWETH");
  const weth = await MockWETH.deploy();
  await weth.waitForDeployment();

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdg = await MockERC20.deploy("Dynamo Testnet USD", "USDG", 18);
  await usdg.waitForDeployment();

  const MockSwapRouter = await ethers.getContractFactory("MockSwapRouter");
  const router = await MockSwapRouter.deploy(await weth.getAddress());
  await router.waitForDeployment();

  // Seed the router with ETH so it can back the USDG->WETH leg of
  // accrueAndFundKeeperGas() with real, withdrawable WETH.
  await (await deployer.sendTransaction({ to: await router.getAddress(), value: ethers.parseEther("5") })).wait();

  await (await router.setPrice(await usdg.getAddress(), USD8(1))).wait();
  await (await router.setPrice(await weth.getAddress(), USD8(WETH_PRICE))).wait();

  const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
  const stocks = [];
  for (const s of STOCKS) {
    const token = await MockERC20.deploy(s.name, s.symbol, 18);
    await token.waitForDeployment();
    const feed = await MockPriceFeed.deploy(USD8(s.price), 8);
    await feed.waitForDeployment();
    await (await router.setPrice(await token.getAddress(), USD8(s.price))).wait();
    stocks.push({ ...s, token, feed });
  }

  // EntryPoint v0.7 — the real, canonical implementation (not mocked).
  const EntryPoint = await ethers.getContractFactory("EntryPoint");
  const entryPoint = await EntryPoint.deploy();
  await entryPoint.waitForDeployment();

  const DynamoGasSponsor = await ethers.getContractFactory("DynamoGasSponsor");
  const gasSponsor = await DynamoGasSponsor.deploy(await entryPoint.getAddress());
  await gasSponsor.waitForDeployment();

  const DynamoVault = await ethers.getContractFactory("DynamoVault");
  const vault = await DynamoVault.deploy(
    await usdg.getAddress(),
    await weth.getAddress(),
    await router.getAddress(),
    "Dynamo Basket",
    "DYNAMO"
  );
  await vault.waitForDeployment();

  for (const s of stocks) {
    await (await vault.addAsset(await s.token.getAddress(), await s.feed.getAddress(), s.targetBps)).wait();
  }
  // Basket only sums to 10_000 bps once every asset exists — lock weights
  // in now that they do (also exercises the _checkWeights invariant once).
  await (await vault.setWeights(stocks.map((s) => s.targetBps))).wait();

  const policyId = ethers.id("dynamo-basket-app");
  await (
    await vault.bootstrapGasSponsor(
      await gasSponsor.getAddress(),
      policyId,
      ethers.parseEther("0.05"), // daily cap
      ethers.parseEther("0.01") // per-op cap
    )
  ).wait();

  const deployment = {
    network: network.name,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      EntryPoint: await entryPoint.getAddress(),
      DynamoGasSponsor: await gasSponsor.getAddress(),
      DynamoVault: await vault.getAddress(),
      MockSwapRouter: await router.getAddress(),
      MockWETH: await weth.getAddress(),
      USDG: await usdg.getAddress(),
    },
    stocks: Object.fromEntries(
      await Promise.all(stocks.map(async (s) => [s.symbol, { token: await s.token.getAddress(), feed: await s.feed.getAddress(), targetBps: s.targetBps }]))
    ),
    policyId,
    note: "USDG/WETH/Stock Tokens/router/feeds are testnet-only mocks standing in for Robinhood Chain infrastructure. EntryPoint and DynamoVault/DynamoGasSponsor are the real reference contracts.",
  };

  const outPath = path.join(__dirname, "..", `deployed.${network.name}.json`);
  fs.writeFileSync(outPath, JSON.stringify(deployment, null, 2));
  console.log(`\nWrote ${path.relative(path.join(__dirname, "../.."), outPath)}`);
  console.log(JSON.stringify(deployment.contracts, null, 2));

  return deployment;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}

module.exports = { main, STOCKS };
