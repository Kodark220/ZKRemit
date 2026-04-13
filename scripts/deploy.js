const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying ZKRemit with account:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));

  // 1. Deploy ComplianceVerifier
  console.log("\n1. Deploying ComplianceVerifier...");
  const ComplianceVerifier = await hre.ethers.getContractFactory("ComplianceVerifier");
  const verifier = await ComplianceVerifier.deploy();
  await verifier.waitForDeployment();
  console.log("   ComplianceVerifier:", await verifier.getAddress());

  // 2. Deploy or use existing KYC SBT
  const kycSBTAddress = process.env.KYC_SBT_ADDRESS;
  let kycAddress;

  if (!kycSBTAddress || kycSBTAddress === "0x0000000000000000000000000000000000000000") {
    console.log("\n2. Deploying MockKycSBT (testnet)...");
    const MockKycSBT = await hre.ethers.getContractFactory("MockKycSBT");
    const mockKyc = await MockKycSBT.deploy();
    await mockKyc.waitForDeployment();
    kycAddress = await mockKyc.getAddress();
    console.log("   MockKycSBT:", kycAddress);

    // Set deployer as KYC-verified for testing
    await mockKyc.setKyc(deployer.address, 2, 1); // ADVANCED, APPROVED
    console.log("   Set deployer KYC: ADVANCED, APPROVED");
  } else {
    kycAddress = kycSBTAddress;
    console.log("\n2. Using existing KYC SBT:", kycAddress);
  }

  // 3. Deploy HSPSettlement
  console.log("\n3. Deploying HSPSettlement...");
  const HSPSettlement = await hre.ethers.getContractFactory("HSPSettlement");
  const hspSettlement = await HSPSettlement.deploy(
    kycAddress,
    await verifier.getAddress(),
    deployer.address // fee collector
  );
  await hspSettlement.waitForDeployment();
  console.log("   HSPSettlement:", await hspSettlement.getAddress());

  // 4. Deploy ZKRemitCore
  console.log("\n4. Deploying ZKRemitCore...");
  const ZKRemitCore = await hre.ethers.getContractFactory("ZKRemitCore");
  const zkRemit = await ZKRemitCore.deploy(
    await hspSettlement.getAddress(),
    kycAddress
  );
  await zkRemit.waitForDeployment();
  console.log("   ZKRemitCore:", await zkRemit.getAddress());

  // 5. Deploy MockUSDT for testnet
  let usdtAddress;
  if (hre.network.name === "hashkeyTestnet" || hre.network.name === "hardhat" || hre.network.name === "localhost") {
    console.log("\n5. Deploying MockUSDT (testnet)...");
    const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
    const mockUSDT = await MockUSDT.deploy();
    await mockUSDT.waitForDeployment();
    usdtAddress = await mockUSDT.getAddress();
    console.log("   MockUSDT:", usdtAddress);
  } else {
    usdtAddress = "0xf1b50ed67a9e2cc94ad3c477779e2d4cbfff9029"; // HashKey Mainnet USDT
    console.log("\n5. Using mainnet USDT:", usdtAddress);
  }

  // Summary
  console.log("\n========================================");
  console.log("ZKRemit Deployment Complete!");
  console.log("========================================");
  console.log("ComplianceVerifier:", await verifier.getAddress());
  console.log("KYC SBT:          ", kycAddress);
  console.log("HSPSettlement:    ", await hspSettlement.getAddress());
  console.log("ZKRemitCore:      ", await zkRemit.getAddress());
  console.log("USDT:             ", usdtAddress);
  console.log("Network:          ", hre.network.name);
  console.log("========================================");

  // Write deployment addresses to file
  const deployment = {
    network: hre.network.name,
    complianceVerifier: await verifier.getAddress(),
    kycSBT: kycAddress,
    hspSettlement: await hspSettlement.getAddress(),
    zkRemitCore: await zkRemit.getAddress(),
    usdt: usdtAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  const fs = require("fs");
  fs.writeFileSync(
    `deployment-${hre.network.name}.json`,
    JSON.stringify(deployment, null, 2)
  );
  console.log(`\nDeployment saved to deployment-${hre.network.name}.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
