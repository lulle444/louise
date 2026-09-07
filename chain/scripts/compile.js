// Manual compile step: Hardhat's own `compile` task downloads the solc
// binary from binaries.soliditylang.org, which this sandbox's network
// policy blocks. We use the pure-JS `solc` npm package instead (installed
// from the npm registry, which is reachable) and write the output into
// Hardhat's own artifacts layout so `hre.ethers.getContractFactory(...)`
// still works unmodified in deploy/demo scripts.
const fs = require("fs");
const path = require("path");
const solc = require("solc");

const ROOT = path.join(__dirname, "..", "..");
const CONTRACTS_DIR = path.join(ROOT, "contracts");
const ARTIFACTS_DIR = path.join(ROOT, "chain", "artifacts");

const SOURCES = [
  "DynamoVault.sol",
  "DynamoGasSponsor.sol",
  "mocks/MockERC20.sol",
  "mocks/MockWETH.sol",
  "mocks/MockPriceFeed.sol",
  "mocks/MockSwapRouter.sol",
  "@account-abstraction/contracts/core/EntryPoint.sol",
];

function findImports(importPath) {
  const candidates = [
    path.join(CONTRACTS_DIR, importPath),
    path.join(ROOT, "node_modules", importPath),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return { contents: fs.readFileSync(candidate, "utf8") };
    }
  }
  return { error: `File not found: ${importPath}` };
}

function sourceNameFor(entry) {
  if (entry.startsWith("@")) return entry; // library import, e.g. @account-abstraction/contracts/...
  return "contracts/" + entry;
}

const input = {
  language: "Solidity",
  sources: {},
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object", "evm.bytecode.linkReferences"],
      },
    },
  },
};

for (const entry of SOURCES) {
  const sourceName = sourceNameFor(entry);
  const contents = entry.startsWith("@")
    ? fs.readFileSync(path.join(ROOT, "node_modules", entry), "utf8")
    : fs.readFileSync(path.join(CONTRACTS_DIR, entry), "utf8");
  input.sources[sourceName] = { content: contents };
}

console.log("Compiling with solc " + solc.version() + " ...");
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

let hadError = false;
for (const err of output.errors || []) {
  if (err.severity === "error") {
    hadError = true;
    console.error(err.formattedMessage);
  } else {
    console.warn(err.formattedMessage);
  }
}
if (hadError) {
  process.exit(1);
}

let written = 0;
for (const [sourceName, contractsInFile] of Object.entries(output.contracts)) {
  for (const [contractName, contract] of Object.entries(contractsInFile)) {
    const outDir = path.join(ARTIFACTS_DIR, sourceName);
    fs.mkdirSync(outDir, { recursive: true });
    const artifact = {
      _format: "hh-sol-artifact-1",
      contractName,
      sourceName,
      abi: contract.abi,
      bytecode: "0x" + contract.evm.bytecode.object,
      deployedBytecode: "0x" + contract.evm.deployedBytecode.object,
      linkReferences: contract.evm.bytecode.linkReferences || {},
      deployedLinkReferences: contract.evm.deployedBytecode.linkReferences || {},
    };
    fs.writeFileSync(path.join(outDir, contractName + ".json"), JSON.stringify(artifact, null, 2));
    written++;
  }
}

console.log(`Wrote ${written} artifacts to ${path.relative(ROOT, ARTIFACTS_DIR)}/`);
