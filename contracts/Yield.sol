// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IFlashLoanReceiver {
    function executeOperation(uint256 amount, uint256 fee) external;
}

interface IExternalLendingProtocol {
    function depositETH() external payable returns (uint256 usdcAmountReceived);
    function withdrawUSDC(uint256 amount) external;
}

contract LendingPool is Ownable {
    IERC20 public immutable usdc;
    IExternalLendingProtocol public externalLender;

    mapping(address => uint256) public collateral;
    mapping(address => uint256) public debt;

    uint256 public constant LTV = 75; // 75%
    uint256 public constant INTEREST_RATE = 5; // 5% interest
    uint256 public constant FLASH_LOAN_FEE_BPS = 10; // 0.1% fee

    constructor(IERC20 _usdc, IExternalLendingProtocol _externalLender) Ownable(msg.sender) {
        usdc = _usdc;
        externalLender = _externalLender;
    }

    // Deposit ETH, convert to USDC via external protocol
    function depositETHCollateral() external payable {
        require(msg.value > 0, "Send ETH");
        uint256 usdcReceived = externalLender.depositETH{value: msg.value}();
        collateral[msg.sender] += usdcReceived;
    }

    // Users can directly deposit USDC (skip ETH conversion)
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        usdc.transferFrom(msg.sender, address(this), amount);
        collateral[msg.sender] += amount;
    }

    function borrow(uint256 amount) external {
        uint256 maxBorrow = (collateral[msg.sender] * LTV) / 100;
        require(debt[msg.sender] + amount <= maxBorrow, "Exceeds max LTV");

        debt[msg.sender] += amount;
        usdc.transfer(msg.sender, amount);
    }

    function repay(uint256 amount) external {
        require(amount > 0 && debt[msg.sender] > 0, "Invalid repay");
        usdc.transferFrom(msg.sender, address(this), amount);
        debt[msg.sender] -= amount;
    }

    function withdrawCollateral(uint256 amount) external {
        require(amount > 0, "Invalid amount");
        uint256 remainingCollateral = collateral[msg.sender] - amount;
        uint256 maxBorrow = (remainingCollateral * LTV) / 100;
        require(debt[msg.sender] <= maxBorrow, "Still under-collateralized");

        collateral[msg.sender] -= amount;
        usdc.transfer(msg.sender, amount);
    }

    function viewHealth(address user) external view returns (uint256 healthFactor) {
        if (debt[user] == 0) return type(uint256).max;
        healthFactor = (collateral[user] * 100) / debt[user];
    }

    /// @notice Simple flash loan functionality with fee
    function flashLoan(uint256 amount, address receiver) external {
        require(amount > 0, "Amount must be > 0");
        uint256 balanceBefore = usdc.balanceOf(address(this));
        require(balanceBefore >= amount, "Not enough liquidity");

        uint256 fee = (amount * FLASH_LOAN_FEE_BPS) / 10_000;
        usdc.transfer(receiver, amount);

        IFlashLoanReceiver(receiver).executeOperation(amount, fee);

        uint256 balanceAfter = usdc.balanceOf(address(this));
        require(balanceAfter >= balanceBefore + fee, "Flash loan not repaid with fee");
    }

    // Admin-only: withdraw USDC from external protocol
    function withdrawFromExternal(uint256 amount) external onlyOwner {
        externalLender.withdrawUSDC(amount);
    }

    receive() external payable {} // Accept ETH
}
