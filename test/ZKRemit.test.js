const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ZKRemit Protocol", function () {
  let deployer, sender, recipient;
  let mockKyc, mockUSDT, verifier, hspSettlement, zkRemit;

  const AMOUNT = ethers.parseUnits("100", 6); // 100 USDT

  beforeEach(async function () {
    [deployer, sender, recipient] = await ethers.getSigners();

    // Deploy mocks
    const MockKycSBT = await ethers.getContractFactory("MockKycSBT");
    mockKyc = await MockKycSBT.deploy();

    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    mockUSDT = await MockUSDT.deploy();

    // Deploy core contracts
    const ComplianceVerifier = await ethers.getContractFactory("ComplianceVerifier");
    verifier = await ComplianceVerifier.deploy();

    const HSPSettlement = await ethers.getContractFactory("HSPSettlement");
    hspSettlement = await HSPSettlement.deploy(
      await mockKyc.getAddress(),
      await verifier.getAddress(),
      deployer.address
    );

    const ZKRemitCore = await ethers.getContractFactory("ZKRemitCore");
    zkRemit = await ZKRemitCore.deploy(
      await hspSettlement.getAddress(),
      await mockKyc.getAddress()
    );

    // Setup: KYC approve sender
    await mockKyc.setKyc(sender.address, 2, 1); // ADVANCED, APPROVED

    // Setup: Give sender USDT
    await mockUSDT.mint(sender.address, ethers.parseUnits("10000", 6));
  });

  describe("HSP Settlement", function () {
    it("should create a payment request", async function () {
      const tx = await hspSettlement.connect(sender).createPaymentRequest(
        recipient.address,
        await mockUSDT.getAddress(),
        AMOUNT,
        "HKD",
        "PHP",
        "HK-PH"
      );

      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      const requests = await hspSettlement.getUserRequests(sender.address);
      expect(requests.length).to.equal(1);

      const request = await hspSettlement.getPaymentRequest(requests[0]);
      expect(request.sender).to.equal(sender.address);
      expect(request.recipient).to.equal(recipient.address);
      expect(request.amount).to.equal(AMOUNT);
      expect(request.status).to.equal(1); // REQUESTED
    });

    it("should reject requests from non-KYC users", async function () {
      await expect(
        hspSettlement.connect(recipient).createPaymentRequest(
          sender.address,
          await mockUSDT.getAddress(),
          AMOUNT,
          "HKD",
          "PHP",
          "HK-PH"
        )
      ).to.be.revertedWithCustomError(hspSettlement, "KycCheckFailed");
    });

    it("should reject unsupported corridors", async function () {
      await expect(
        hspSettlement.connect(sender).createPaymentRequest(
          recipient.address,
          await mockUSDT.getAddress(),
          AMOUNT,
          "USD",
          "EUR",
          "US-EU"
        )
      ).to.be.revertedWithCustomError(hspSettlement, "InvalidCorridor");
    });

    it("should confirm payment with ZK proof and lock funds", async function () {
      // Create request
      await hspSettlement.connect(sender).createPaymentRequest(
        recipient.address,
        await mockUSDT.getAddress(),
        AMOUNT,
        "HKD",
        "PHP",
        "HK-PH"
      );

      const requests = await hspSettlement.getUserRequests(sender.address);
      const requestId = requests[0];
      const request = await hspSettlement.getPaymentRequest(requestId);
      const totalAmount = request.amount + request.fee;

      // Approve USDT spending
      await mockUSDT.connect(sender).approve(await hspSettlement.getAddress(), totalAmount);

      // Generate demo ZK proof signals
      const timestamp = Math.floor(Date.now() / 1000);
      const pubSignals = [
        "12345678",  // kycLevelHash (non-zero)
        "1",          // amountInRange
        "1",          // sanctionsClear
        "87654321",  // corridorHash (non-zero)
        timestamp.toString(),
        "99999999",  // nullifier (non-zero)
      ];

      // Demo proof values (small numbers for testing)
      const pA = ["1", "2"];
      const pB = [["1", "2"], ["3", "4"]];
      const pC = ["1", "2"];

      await hspSettlement.connect(sender).confirmPaymentWithProof(
        requestId, pA, pB, pC, pubSignals
      );

      const updated = await hspSettlement.getPaymentRequest(requestId);
      expect(updated.status).to.equal(2); // CONFIRMED
    });

    it("should settle payment and release funds", async function () {
      // Create & confirm flow
      await hspSettlement.connect(sender).createPaymentRequest(
        recipient.address,
        await mockUSDT.getAddress(),
        AMOUNT,
        "HKD",
        "PHP",
        "HK-PH"
      );

      const requests = await hspSettlement.getUserRequests(sender.address);
      const requestId = requests[0];
      const request = await hspSettlement.getPaymentRequest(requestId);
      const totalAmount = request.amount + request.fee;

      await mockUSDT.connect(sender).approve(await hspSettlement.getAddress(), totalAmount);

      const timestamp = Math.floor(Date.now() / 1000);
      const pubSignals = ["111", "1", "1", "222", timestamp.toString(), "333"];
      await hspSettlement.connect(sender).confirmPaymentWithProof(
        requestId, ["1", "2"], [["1", "2"], ["3", "4"]], ["1", "2"], pubSignals
      );

      // Check recipient balance before
      const balanceBefore = await mockUSDT.balanceOf(recipient.address);

      // Settle
      await hspSettlement.connect(sender).settlePayment(requestId);

      const balanceAfter = await mockUSDT.balanceOf(recipient.address);
      expect(balanceAfter - balanceBefore).to.equal(AMOUNT);

      const settled = await hspSettlement.getPaymentRequest(requestId);
      expect(settled.status).to.equal(3); // SETTLED
    });

    it("should prevent nullifier reuse", async function () {
      // Create first request
      await hspSettlement.connect(sender).createPaymentRequest(
        recipient.address, await mockUSDT.getAddress(), AMOUNT, "HKD", "PHP", "HK-PH"
      );
      const requests1 = await hspSettlement.getUserRequests(sender.address);
      const request1 = await hspSettlement.getPaymentRequest(requests1[0]);
      await mockUSDT.connect(sender).approve(
        await hspSettlement.getAddress(), request1.amount + request1.fee
      );

      const nullifier = "777777";
      const timestamp = Math.floor(Date.now() / 1000);
      const pubSignals = ["111", "1", "1", "222", timestamp.toString(), nullifier];
      await hspSettlement.connect(sender).confirmPaymentWithProof(
        requests1[0], ["1", "2"], [["1", "2"], ["3", "4"]], ["1", "2"], pubSignals
      );

      // Create second request with same nullifier
      await hspSettlement.connect(sender).createPaymentRequest(
        recipient.address, await mockUSDT.getAddress(), AMOUNT, "HKD", "PHP", "HK-PH"
      );
      const requests2 = await hspSettlement.getUserRequests(sender.address);
      const lastReqId = requests2[requests2.length - 1];
      const request2 = await hspSettlement.getPaymentRequest(lastReqId);
      await mockUSDT.connect(sender).approve(
        await hspSettlement.getAddress(), request2.amount + request2.fee
      );

      const pubSignals2 = ["111", "1", "1", "222", (timestamp + 1).toString(), nullifier];
      await expect(
        hspSettlement.connect(sender).confirmPaymentWithProof(
          lastReqId, ["1", "2"], [["1", "2"], ["3", "4"]], ["1", "2"], pubSignals2
        )
      ).to.be.revertedWithCustomError(hspSettlement, "NullifierUsed");
    });
  });

  describe("ZKRemit Core", function () {
    it("should return accurate quotes", async function () {
      const [recipientAmount, fee, rate] = await zkRemit.getQuote(AMOUNT, "HK-PH");
      expect(rate).to.equal(7200000n); // 7.2 PHP per HKD
      expect(fee).to.be.gt(0n);
      expect(recipientAmount).to.be.gt(0n);
    });

    it("should list all supported corridors", async function () {
      const corridors = await zkRemit.getAllCorridors();
      expect(corridors.length).to.equal(10);
      expect(corridors).to.include("HK-PH");
      expect(corridors).to.include("HK-NG");
    });

    it("should reject amounts below minimum", async function () {
      await expect(
        zkRemit.connect(sender).createRemittance(
          recipient.address,
          await mockUSDT.getAddress(),
          1000, // way below minimum
          "HK-PH"
        )
      ).to.be.revertedWithCustomError(zkRemit, "AmountBelowMinimum");
    });
  });

  describe("Compliance Verifier", function () {
    it("should validate proof structure", async function () {
      const timestamp = Math.floor(Date.now() / 1000);
      const pubSignals = ["111", "1", "1", "222", timestamp.toString(), "333"];
      const result = await verifier.verifyProof(
        ["1", "2"],
        [["1", "2"], ["3", "4"]],
        ["1", "2"],
        pubSignals
      );
      expect(result).to.be.true;
    });

    it("should reject invalid sanctionsClear signal", async function () {
      const timestamp = Math.floor(Date.now() / 1000);
      const pubSignals = ["111", "1", "0", "222", timestamp.toString(), "333"]; // sanctionsClear = 0
      await expect(
        verifier.verifyProof(["1", "2"], [["1", "2"], ["3", "4"]], ["1", "2"], pubSignals)
      ).to.be.revertedWith("sanctions check failed");
    });

    it("should reject if amount not in range", async function () {
      const timestamp = Math.floor(Date.now() / 1000);
      const pubSignals = ["111", "0", "1", "222", timestamp.toString(), "333"]; // amountInRange = 0
      await expect(
        verifier.verifyProof(["1", "2"], [["1", "2"], ["3", "4"]], ["1", "2"], pubSignals)
      ).to.be.revertedWith("amount not in AML range");
    });

    it("should validate nullifier structure", async function () {
      expect(await verifier.isValidNullifier(123456)).to.be.true;
      expect(await verifier.isValidNullifier(0)).to.be.false;
    });
  });

  describe("Protocol Fee", function () {
    it("should calculate 0.3% fee", async function () {
      const fee = await hspSettlement.calculateFee(AMOUNT);
      const expectedFee = (AMOUNT * 30n) / 10000n;
      expect(fee).to.equal(expectedFee);
    });

    it("should collect fees on settlement", async function () {
      // Full flow
      await hspSettlement.connect(sender).createPaymentRequest(
        recipient.address, await mockUSDT.getAddress(), AMOUNT, "HKD", "PHP", "HK-PH"
      );
      const requests = await hspSettlement.getUserRequests(sender.address);
      const requestId = requests[0];
      const request = await hspSettlement.getPaymentRequest(requestId);
      const totalAmount = request.amount + request.fee;

      await mockUSDT.connect(sender).approve(await hspSettlement.getAddress(), totalAmount);

      const timestamp = Math.floor(Date.now() / 1000);
      await hspSettlement.connect(sender).confirmPaymentWithProof(
        requestId, ["1", "2"], [["1", "2"], ["3", "4"]], ["1", "2"],
        ["111", "1", "1", "222", timestamp.toString(), "444"]
      );

      const feeCollectorBefore = await mockUSDT.balanceOf(deployer.address);
      await hspSettlement.connect(sender).settlePayment(requestId);
      const feeCollectorAfter = await mockUSDT.balanceOf(deployer.address);

      expect(feeCollectorAfter - feeCollectorBefore).to.equal(request.fee);
    });
  });
});
