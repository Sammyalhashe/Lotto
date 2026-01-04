# Yield Strategy Integration Guide

This document explains how the **Lotto** contract manages funds and how to transition from the development `MockYieldStrategy` to a real DeFi protocol like **Yield Yak** or **Benqi** for production.

## 1. The Strategy Pattern
The Lotto contract does not manage yield logic directly. Instead, it interacts with an interface: `IYieldStrategy`.

```solidity
interface IYieldStrategy {
    function deposit(uint256 _lotteryId) external payable;
    function withdrawPrincipal(uint256 _amount) external returns (uint256);
    function withdrawYield(uint256 _amount) external returns (uint256);
    function getTotalBalance() external view returns (uint256);
    function getPrincipalBalance() external view returns (uint256);
}
```

*   **Lotto Contract:** "Here is money (`deposit`). Give me back principal later (`withdrawPrincipal`). Give me any profit (`withdrawYield`)."
*   **Strategy Contract:** Handles the complexity of talking to Aave, Yield Yak, etc.

## 2. Current Setup (Development)
We currently use `MockYieldStrategy.sol`.
*   **Deposit:** Just stores ETH in the contract variable `totalDeposited`.
*   **Yield:** Simulated by manually sending extra ETH to the contract address.
*   **Withdraw:** Just sends ETH back.

## 3. Production: Integrating Yield Yak
To go live on Avalanche, you will write a `YieldYakStrategy.sol`.

### Prerequisites
1.  **Yield Yak Router:** Find the router address for the specific farm you want (e.g., Aave AVAX Farm or Benqi sAVAX).
2.  **Tokens:** Yield Yak usually accepts `WAVAX` (Wrapped AVAX) or specific tokens. You may need to wrap `msg.value` into `WAVAX` before depositing.

### Implementation Sketch (`YieldYakStrategy.sol`)

```solidity
import "./interfaces/IYieldStrategy.sol";
import "./interfaces/IYieldYak.sol"; // You need the Yak interface
import "./interfaces/IWAVAX.sol";

contract YieldYakStrategy is IYieldStrategy {
    address public yakFarm;
    address public wavax;
    
    // We track how much principal (in AVAX terms) we have put in
    uint256 public totalPrincipal; 

    constructor(address _yakFarm, address _wavax) {
        yakFarm = _yakFarm;
        wavax = _wavax;
    }

    function deposit(uint256 _lotteryId) external payable override {
        // 1. Update accounting
        totalPrincipal += msg.value;
        
        // 2. Wrap AVAX -> WAVAX
        IWAVAX(wavax).deposit{value: msg.value}();
        
        // 3. Deposit WAVAX into Yield Yak
        IERC20(wavax).approve(yakFarm, msg.value);
        IYieldYak(yakFarm).deposit(msg.value);
    }

    function withdrawPrincipal(uint256 _amount) external override returns (uint256) {
        // 1. Withdraw WAVAX from Yak
        // Note: Yak returns tokens based on shares. Logic needed to calc shares.
        uint256 sharesToBurn = ...; // Calculate shares for _amount WAVAX
        IYieldYak(yakFarm).withdraw(sharesToBurn);
        
        // 2. Unwrap WAVAX -> AVAX
        IWAVAX(wavax).withdraw(_amount);
        
        // 3. Send AVAX to Lotto
        (bool sent,) = msg.sender.call{value: _amount}("");
        require(sent, "Failed");
        
        totalPrincipal -= _amount;
        return _amount;
    }
    
    // ... withdrawYield logic similarly withdraws the EXCESS shares ...
}
```

### Key Challenges for Real Strategies
1.  **Share Price:** Yield bearing tokens (like `yakAVAX`) grow in value. 1 share != 1 AVAX. You need to calculate: `Balance = Shares * SharePrice`.
2.  **Slippage:** Swapping or depositing might have slight dust/slippage.
3.  **Withdrawal Limits:** Some farms have lockups or withdrawal limits.

## 4. Deployment Steps
1.  Write `YieldYakStrategy.sol`.
2.  Test it on **Avalanche Fork** (Hardhat Mainnet Forking) to ensure it works with the real Yield Yak contracts.
3.  Deploy `YieldYakStrategy` to Fuji/Mainnet.
4.  Deploy `Lotto` passing the address of your new `YieldYakStrategy`.
