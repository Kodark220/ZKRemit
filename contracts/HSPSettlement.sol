// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IKycSBT.sol";
import "./interfaces/IComplianceVerifier.sol";

/// @title HSPSettlement - HashKey Settlement Protocol Integration
/// @notice Implements HSP-compatible payment request, confirmation, and receipt flow
///         for cross-border remittance settlement on HashKey Chain.
/// @dev HSP handles message transmission, verification, and status synchronization.
///      This contract does not manage funds directly - it coordinates settlement flow.
contract HSPSettlement is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ============ Enums ============

    enum PaymentStatus {
        NONE,
        REQUESTED,      // Payment request created
        CONFIRMED,      // Sender confirmed, funds locked
        SETTLED,        // Funds released to recipient
        CANCELLED,      // Payment cancelled
        DISPUTED        // Payment under dispute
    }

    // ============ Structs ============

    /// @notice HSP Payment Request message
    struct PaymentRequest {
        bytes32 requestId;          // Unique payment request identifier
        address sender;             // Remittance sender
        address recipient;          // Remittance recipient
        address token;              // Settlement token (e.g., USDT)
        uint256 amount;             // Settlement amount
        uint256 fee;                // Protocol fee
        string sourceCurrency;      // Source fiat currency code (e.g., "HKD")
        string targetCurrency;      // Target fiat currency code (e.g., "PHP")
        string corridor;            // Remittance corridor identifier
        uint256 createdAt;          // Request creation timestamp
        uint256 expiresAt;          // Request expiry timestamp
        PaymentStatus status;       // Current payment status
    }

    /// @notice HSP Payment Confirmation
    struct PaymentConfirmation {
        bytes32 requestId;
        address confirmedBy;
        uint256 confirmedAt;
        bytes32 zkProofHash;        // Hash of the ZK compliance proof
    }

    /// @notice HSP Payment Receipt
    struct PaymentReceipt {
        bytes32 requestId;
        address sender;
        address recipient;
        uint256 amount;
        uint256 settledAt;
        bytes32 txHash;             // On-chain transaction hash
    }

    // ============ State ============

    IKycSBT public kycSBT;
    IComplianceVerifier public complianceVerifier;

    mapping(bytes32 => PaymentRequest) public paymentRequests;
    mapping(bytes32 => PaymentConfirmation) public confirmations;
    mapping(bytes32 => PaymentReceipt) public receipts;
    mapping(address => bytes32[]) public userRequests;
    mapping(uint256 => bool) public usedNullifiers;

    uint256 public protocolFeeRate = 30; // 0.3% (basis points / 10000)
    uint256 public constant MAX_FEE_RATE = 100; // 1% max
    uint256 public constant REQUEST_EXPIRY = 24 hours;
    uint256 public constant MIN_KYC_LEVEL = 1; // BASIC minimum

    address public feeCollector;
    uint256 public totalSettledVolume;
    uint256 public totalRemittances;

    // Supported corridors
    mapping(string => bool) public supportedCorridors;

    // ============ Events ============

    event PaymentRequested(
        bytes32 indexed requestId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        string corridor
    );

    event PaymentConfirmed(
        bytes32 indexed requestId,
        address indexed sender,
        bytes32 zkProofHash
    );

    event PaymentSettled(
        bytes32 indexed requestId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 fee
    );

    event PaymentCancelled(bytes32 indexed requestId, address indexed cancelledBy);
    event CorridorUpdated(string corridor, bool supported);
    event FeeRateUpdated(uint256 newFeeRate);

    // ============ Errors ============

    error InvalidRecipient();
    error InvalidAmount();
    error InvalidCorridor();
    error RequestNotFound();
    error InvalidStatus();
    error RequestExpired();
    error NotAuthorized();
    error KycCheckFailed();
    error ZkProofFailed();
    error NullifierUsed();

    // ============ Constructor ============

    constructor(
        address _kycSBT,
        address _complianceVerifier,
        address _feeCollector
    ) Ownable(msg.sender) {
        kycSBT = IKycSBT(_kycSBT);
        complianceVerifier = IComplianceVerifier(_complianceVerifier);
        feeCollector = _feeCollector;

        // Initialize common remittance corridors from Hong Kong
        supportedCorridors["HK-PH"] = true;   // Hong Kong -> Philippines
        supportedCorridors["HK-ID"] = true;   // Hong Kong -> Indonesia
        supportedCorridors["HK-TH"] = true;   // Hong Kong -> Thailand
        supportedCorridors["HK-VN"] = true;   // Hong Kong -> Vietnam
        supportedCorridors["HK-IN"] = true;   // Hong Kong -> India
        supportedCorridors["HK-PK"] = true;   // Hong Kong -> Pakistan
        supportedCorridors["HK-BD"] = true;   // Hong Kong -> Bangladesh
        supportedCorridors["HK-NP"] = true;   // Hong Kong -> Nepal
        supportedCorridors["HK-LK"] = true;   // Hong Kong -> Sri Lanka
        supportedCorridors["HK-NG"] = true;   // Hong Kong -> Nigeria
    }

    // ============ Core HSP Flow ============

    /// @notice Step 1: Create a payment request (HSP Request Message)
    /// @param recipient The remittance recipient address
    /// @param token The settlement token address (e.g., USDT)
    /// @param amount The remittance amount
    /// @param sourceCurrency Source fiat currency code
    /// @param targetCurrency Target fiat currency code
    /// @param corridor The remittance corridor (e.g., "HK-PH")
    function createPaymentRequest(
        address recipient,
        address token,
        uint256 amount,
        string calldata sourceCurrency,
        string calldata targetCurrency,
        string calldata corridor
    ) external returns (bytes32 requestId) {
        if (recipient == address(0) || recipient == msg.sender) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
        if (!supportedCorridors[corridor]) revert InvalidCorridor();

        // Verify sender has minimum KYC level on HashKey Chain
        (bool isValid, uint8 kycLevel) = kycSBT.isHuman(msg.sender);
        if (!isValid || kycLevel < MIN_KYC_LEVEL) revert KycCheckFailed();

        // Generate unique request ID
        requestId = keccak256(abi.encodePacked(
            msg.sender,
            recipient,
            amount,
            block.timestamp,
            block.number
        ));

        uint256 fee = (amount * protocolFeeRate) / 10000;

        paymentRequests[requestId] = PaymentRequest({
            requestId: requestId,
            sender: msg.sender,
            recipient: recipient,
            token: token,
            amount: amount,
            fee: fee,
            sourceCurrency: sourceCurrency,
            targetCurrency: targetCurrency,
            corridor: corridor,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + REQUEST_EXPIRY,
            status: PaymentStatus.REQUESTED
        });

        userRequests[msg.sender].push(requestId);
        userRequests[recipient].push(requestId);

        emit PaymentRequested(requestId, msg.sender, recipient, amount, corridor);
    }

    /// @notice Step 2: Confirm payment with ZK compliance proof (HSP Confirmation)
    /// @param requestId The payment request to confirm
    /// @param _pA ZK proof element A
    /// @param _pB ZK proof element B
    /// @param _pC ZK proof element C
    /// @param _pubSignals Public signals from the ZK proof
    function confirmPaymentWithProof(
        bytes32 requestId,
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[6] calldata _pubSignals
    ) external nonReentrant {
        PaymentRequest storage request = paymentRequests[requestId];
        if (request.sender == address(0)) revert RequestNotFound();
        if (request.status != PaymentStatus.REQUESTED) revert InvalidStatus();
        if (block.timestamp > request.expiresAt) revert RequestExpired();
        if (msg.sender != request.sender) revert NotAuthorized();

        // Verify ZK compliance proof
        bool proofValid = complianceVerifier.verifyProof(_pA, _pB, _pC, _pubSignals);
        if (!proofValid) revert ZkProofFailed();

        // Check nullifier hasn't been used (prevents proof replay)
        uint256 nullifier = _pubSignals[5];
        if (usedNullifiers[nullifier]) revert NullifierUsed();
        usedNullifiers[nullifier] = true;

        // Lock funds: transfer tokens from sender to this contract
        uint256 totalAmount = request.amount + request.fee;
        IERC20(request.token).safeTransferFrom(msg.sender, address(this), totalAmount);

        request.status = PaymentStatus.CONFIRMED;

        bytes32 zkProofHash = keccak256(abi.encodePacked(_pA, _pB, _pC));
        confirmations[requestId] = PaymentConfirmation({
            requestId: requestId,
            confirmedBy: msg.sender,
            confirmedAt: block.timestamp,
            zkProofHash: zkProofHash
        });

        emit PaymentConfirmed(requestId, msg.sender, zkProofHash);
    }

    /// @notice Step 3: Settle payment - release funds to recipient (HSP Receipt)
    /// @param requestId The confirmed payment to settle
    function settlePayment(bytes32 requestId) external nonReentrant {
        PaymentRequest storage request = paymentRequests[requestId];
        if (request.sender == address(0)) revert RequestNotFound();
        if (request.status != PaymentStatus.CONFIRMED) revert InvalidStatus();
        // Either sender or recipient can trigger settlement
        if (msg.sender != request.sender && msg.sender != request.recipient) revert NotAuthorized();

        // Transfer funds to recipient
        IERC20(request.token).safeTransfer(request.recipient, request.amount);

        // Transfer fee to fee collector
        if (request.fee > 0) {
            IERC20(request.token).safeTransfer(feeCollector, request.fee);
        }

        request.status = PaymentStatus.SETTLED;
        totalSettledVolume += request.amount;
        totalRemittances++;

        receipts[requestId] = PaymentReceipt({
            requestId: requestId,
            sender: request.sender,
            recipient: request.recipient,
            amount: request.amount,
            settledAt: block.timestamp,
            txHash: bytes32(0) // Set by indexer post-settlement
        });

        emit PaymentSettled(requestId, request.sender, request.recipient, request.amount, request.fee);
    }

    /// @notice Cancel an expired or pending payment request
    /// @param requestId The payment request to cancel
    function cancelPayment(bytes32 requestId) external nonReentrant {
        PaymentRequest storage request = paymentRequests[requestId];
        if (request.sender == address(0)) revert RequestNotFound();
        if (msg.sender != request.sender) revert NotAuthorized();

        if (request.status == PaymentStatus.CONFIRMED) {
            // Refund locked funds
            uint256 totalAmount = request.amount + request.fee;
            IERC20(request.token).safeTransfer(request.sender, totalAmount);
        } else if (request.status != PaymentStatus.REQUESTED) {
            revert InvalidStatus();
        }

        request.status = PaymentStatus.CANCELLED;
        emit PaymentCancelled(requestId, msg.sender);
    }

    // ============ View Functions ============

    function getPaymentRequest(bytes32 requestId) external view returns (PaymentRequest memory) {
        return paymentRequests[requestId];
    }

    function getUserRequests(address user) external view returns (bytes32[] memory) {
        return userRequests[user];
    }

    function getReceipt(bytes32 requestId) external view returns (PaymentReceipt memory) {
        return receipts[requestId];
    }

    function calculateFee(uint256 amount) external view returns (uint256) {
        return (amount * protocolFeeRate) / 10000;
    }

    function isCorridorSupported(string calldata corridor) external view returns (bool) {
        return supportedCorridors[corridor];
    }

    // ============ Admin Functions ============

    function setCorridor(string calldata corridor, bool supported) external onlyOwner {
        supportedCorridors[corridor] = supported;
        emit CorridorUpdated(corridor, supported);
    }

    function setFeeRate(uint256 newFeeRate) external onlyOwner {
        require(newFeeRate <= MAX_FEE_RATE, "Fee too high");
        protocolFeeRate = newFeeRate;
        emit FeeRateUpdated(newFeeRate);
    }

    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Invalid address");
        feeCollector = _feeCollector;
    }

    function updateComplianceVerifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "Invalid address");
        complianceVerifier = IComplianceVerifier(_verifier);
    }
}
