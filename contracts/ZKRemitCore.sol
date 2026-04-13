// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IKycSBT.sol";
import "./HSPSettlement.sol";

/// @title ZKRemitCore - ZK-Compliant Cross-Border Remittance Protocol
/// @notice Main entry point for the ZKRemit protocol. Orchestrates the full
///         remittance lifecycle: corridor selection, ZK compliance proof,
///         HSP settlement, and on-chain receipt generation.
/// @dev Built on HashKey Chain, leveraging native KYC SBT + HSP + ZK proofs.
contract ZKRemitCore is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ============ Structs ============

    struct RemittanceOrder {
        bytes32 orderId;
        bytes32 hspRequestId;      // Linked HSP payment request
        address sender;
        address recipient;
        address token;
        uint256 amount;
        string corridor;
        uint256 exchangeRate;       // Exchange rate * 1e6 (e.g., 1 HKD = 7.2 PHP => 7200000)
        uint256 recipientAmount;    // Amount recipient receives in target currency terms
        uint256 createdAt;
        OrderStatus status;
    }

    enum OrderStatus {
        CREATED,
        COMPLIANCE_VERIFIED,
        FUNDS_LOCKED,
        SETTLED,
        CANCELLED
    }

    struct Corridor {
        string code;                // e.g., "HK-PH"
        string sourceCurrency;      // e.g., "HKD"
        string targetCurrency;      // e.g., "PHP"
        uint256 minAmount;          // Minimum remittance (in token decimals)
        uint256 maxAmount;          // Maximum remittance (in token decimals)
        uint256 exchangeRate;       // Rate * 1e6
        bool active;
    }

    // ============ State ============

    HSPSettlement public hspSettlement;
    IKycSBT public kycSBT;

    mapping(bytes32 => RemittanceOrder) public orders;
    mapping(address => bytes32[]) public userOrders;
    mapping(string => Corridor) public corridors;
    string[] public corridorCodes;

    uint256 public totalOrders;

    // ============ Events ============

    event RemittanceCreated(
        bytes32 indexed orderId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        string corridor,
        uint256 exchangeRate
    );

    event RemittanceCompleted(
        bytes32 indexed orderId,
        address indexed sender,
        address indexed recipient,
        uint256 amount
    );

    event RemittanceCancelled(bytes32 indexed orderId);
    event CorridorConfigured(string code, uint256 minAmount, uint256 maxAmount, uint256 exchangeRate);
    event ExchangeRateUpdated(string corridor, uint256 newRate);

    // ============ Errors ============

    error CorridorNotActive();
    error AmountBelowMinimum();
    error AmountAboveMaximum();
    error OrderNotFound();
    error NotOrderSender();
    error InvalidOrderStatus();

    // ============ Constructor ============

    constructor(
        address _hspSettlement,
        address _kycSBT
    ) Ownable(msg.sender) {
        hspSettlement = HSPSettlement(_hspSettlement);
        kycSBT = IKycSBT(_kycSBT);

        // Configure default corridors (HK outbound)
        _configureCorridor("HK-PH", "HKD", "PHP", 10e6, 50000e6, 7200000);    // 1 HKD ≈ 7.2 PHP
        _configureCorridor("HK-ID", "HKD", "IDR", 10e6, 50000e6, 2020000000); // 1 HKD ≈ 2020 IDR
        _configureCorridor("HK-TH", "HKD", "THB", 10e6, 50000e6, 4400000);    // 1 HKD ≈ 4.4 THB
        _configureCorridor("HK-VN", "HKD", "VND", 10e6, 50000e6, 3200000000); // 1 HKD ≈ 3200 VND
        _configureCorridor("HK-IN", "HKD", "INR", 10e6, 50000e6, 10800000);   // 1 HKD ≈ 10.8 INR
        _configureCorridor("HK-PK", "HKD", "PKR", 10e6, 50000e6, 35600000);   // 1 HKD ≈ 35.6 PKR
        _configureCorridor("HK-BD", "HKD", "BDT", 10e6, 50000e6, 14000000);   // 1 HKD ≈ 14.0 BDT
        _configureCorridor("HK-NP", "HKD", "NPR", 10e6, 50000e6, 17200000);   // 1 HKD ≈ 17.2 NPR
        _configureCorridor("HK-LK", "HKD", "LKR", 10e6, 50000e6, 38000000);   // 1 HKD ≈ 38.0 LKR
        _configureCorridor("HK-NG", "HKD", "NGN", 10e6, 50000e6, 200000000);  // 1 HKD ≈ 200 NGN
    }

    // ============ Core Functions ============

    /// @notice Create a new remittance order and initiate HSP payment request
    /// @param recipient Recipient wallet address
    /// @param token Settlement token (e.g., USDT)
    /// @param amount Amount in token to send
    /// @param corridorCode Corridor identifier (e.g., "HK-PH")
    function createRemittance(
        address recipient,
        address token,
        uint256 amount,
        string calldata corridorCode
    ) external returns (bytes32 orderId) {
        Corridor memory cor = corridors[corridorCode];
        if (!cor.active) revert CorridorNotActive();
        if (amount < cor.minAmount) revert AmountBelowMinimum();
        if (amount > cor.maxAmount) revert AmountAboveMaximum();

        // Create HSP payment request
        bytes32 hspRequestId = hspSettlement.createPaymentRequest(
            recipient,
            token,
            amount,
            cor.sourceCurrency,
            cor.targetCurrency,
            corridorCode
        );

        orderId = keccak256(abi.encodePacked(
            msg.sender,
            recipient,
            amount,
            corridorCode,
            block.timestamp,
            totalOrders
        ));

        uint256 recipientAmount = (amount * cor.exchangeRate) / 1e6;

        orders[orderId] = RemittanceOrder({
            orderId: orderId,
            hspRequestId: hspRequestId,
            sender: msg.sender,
            recipient: recipient,
            token: token,
            amount: amount,
            corridor: corridorCode,
            exchangeRate: cor.exchangeRate,
            recipientAmount: recipientAmount,
            createdAt: block.timestamp,
            status: OrderStatus.CREATED
        });

        userOrders[msg.sender].push(orderId);
        userOrders[recipient].push(orderId);
        totalOrders++;

        emit RemittanceCreated(orderId, msg.sender, recipient, amount, corridorCode, cor.exchangeRate);
    }

    /// @notice Submit ZK compliance proof and lock funds for a remittance order
    /// @param orderId The remittance order ID
    /// @param _pA ZK proof element A
    /// @param _pB ZK proof element B
    /// @param _pC ZK proof element C
    /// @param _pubSignals Public signals from ZK proof
    function submitComplianceProof(
        bytes32 orderId,
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[6] calldata _pubSignals
    ) external nonReentrant {
        RemittanceOrder storage order = orders[orderId];
        if (order.sender == address(0)) revert OrderNotFound();
        if (msg.sender != order.sender) revert NotOrderSender();
        if (order.status != OrderStatus.CREATED) revert InvalidOrderStatus();

        // Confirm payment with ZK proof via HSP
        hspSettlement.confirmPaymentWithProof(
            order.hspRequestId,
            _pA, _pB, _pC, _pubSignals
        );

        order.status = OrderStatus.FUNDS_LOCKED;
    }

    /// @notice Complete the remittance - settle funds to recipient
    /// @param orderId The remittance order ID
    function completeRemittance(bytes32 orderId) external nonReentrant {
        RemittanceOrder storage order = orders[orderId];
        if (order.sender == address(0)) revert OrderNotFound();
        if (order.status != OrderStatus.FUNDS_LOCKED) revert InvalidOrderStatus();
        if (msg.sender != order.sender && msg.sender != order.recipient) revert NotOrderSender();

        // Settle via HSP
        hspSettlement.settlePayment(order.hspRequestId);

        order.status = OrderStatus.SETTLED;

        emit RemittanceCompleted(orderId, order.sender, order.recipient, order.amount);
    }

    /// @notice Cancel a remittance order
    /// @param orderId The remittance order to cancel
    function cancelRemittance(bytes32 orderId) external {
        RemittanceOrder storage order = orders[orderId];
        if (order.sender == address(0)) revert OrderNotFound();
        if (msg.sender != order.sender) revert NotOrderSender();
        if (order.status == OrderStatus.SETTLED) revert InvalidOrderStatus();

        hspSettlement.cancelPayment(order.hspRequestId);
        order.status = OrderStatus.CANCELLED;

        emit RemittanceCancelled(orderId);
    }

    // ============ View Functions ============

    function getOrder(bytes32 orderId) external view returns (RemittanceOrder memory) {
        return orders[orderId];
    }

    function getUserOrders(address user) external view returns (bytes32[] memory) {
        return userOrders[user];
    }

    function getCorridor(string calldata code) external view returns (Corridor memory) {
        return corridors[code];
    }

    function getAllCorridors() external view returns (string[] memory) {
        return corridorCodes;
    }

    function getQuote(
        uint256 amount,
        string calldata corridorCode
    ) external view returns (uint256 recipientAmount, uint256 fee, uint256 rate) {
        Corridor memory cor = corridors[corridorCode];
        require(cor.active, "Corridor not active");
        rate = cor.exchangeRate;
        fee = hspSettlement.calculateFee(amount);
        recipientAmount = ((amount - fee) * rate) / 1e6;
    }

    // ============ Admin Functions ============

    function configureCorridor(
        string calldata code,
        string calldata sourceCurrency,
        string calldata targetCurrency,
        uint256 minAmount,
        uint256 maxAmount,
        uint256 exchangeRate
    ) external onlyOwner {
        _configureCorridor(code, sourceCurrency, targetCurrency, minAmount, maxAmount, exchangeRate);
    }

    function updateExchangeRate(string calldata corridorCode, uint256 newRate) external onlyOwner {
        require(corridors[corridorCode].active, "Corridor not active");
        corridors[corridorCode].exchangeRate = newRate;
        emit ExchangeRateUpdated(corridorCode, newRate);
    }

    function _configureCorridor(
        string memory code,
        string memory sourceCurrency,
        string memory targetCurrency,
        uint256 minAmount,
        uint256 maxAmount,
        uint256 exchangeRate
    ) internal {
        if (!corridors[code].active) {
            corridorCodes.push(code);
        }
        corridors[code] = Corridor({
            code: code,
            sourceCurrency: sourceCurrency,
            targetCurrency: targetCurrency,
            minAmount: minAmount,
            maxAmount: maxAmount,
            exchangeRate: exchangeRate,
            active: true
        });
        emit CorridorConfigured(code, minAmount, maxAmount, exchangeRate);
    }
}
