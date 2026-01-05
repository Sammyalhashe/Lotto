# Yield Integration Guide: Aave & Yield Yak

This guide explains how to upgrade the `MockYieldStrategy` to a real DeFi integration using protocols like **Aave** or **Yield Yak** on Avalanche.

## The Strategy Pattern
Our `Lotto.sol` contract does not interact with DeFi protocols directly. Instead, it talks to a **Strategy** contract via a standard interface (`IYieldStrategy`).

**Flow:**
`Lotto Contract` -> `deposit()` -> `RealStrategy` -> `DeFi Protocol (Aave/Yak)`

This allows us to swap strategies (e.g., switch from Aave to Benqi) without changing the main Lotto contract.

---

## Option 1: Integrating Aave V3

Aave is a lending protocol. You lend assets (like AVAX or USDC) and receive "aTokens" (e.g., aAVAX) in return. These aTokens grow in balance over time as interest accrues.

### 1. The Interface
To talk to Aave, you need the `IPool` interface. You don't need the full code, just the function definitions.

```solidity
// contracts/interfaces/IAavePool.sol
interface IAavePool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}
```

### 2. The Strategy Logic
Aave treats **Native AVAX** differently from ERC-20 tokens. To supply AVAX, you usually interact with a `WAVAXGateway` helper contract, or wrap AVAX into WAVAX (Wrapped AVAX) first.

*For simplicity, let's assume we are using **USDC** (ERC-20).*

```solidity
contract AaveStrategy is IYieldStrategy {
    IERC20 public usdc;
    IERC20 public aUsdc; // Aave receipt token
    IAavePool public aavePool;

    constructor(address _usdc, address _aUsdc, address _pool) {
        usdc = IERC20(_usdc);
        aUsdc = IERC20(_aUsdc);
        aavePool = IAavePool(_pool);
    }

    function deposit(uint256 lottoId) external payable override {
        // 1. Lotto sends USDC to this contract (via transferFrom)
        // 2. Approve Aave to spend our USDC
        usdc.approve(address(aavePool), amount);
        
        // 3. Supply to Aave
        // onBehalfOf = address(this) means WE hold the aTokens
        aavePool.supply(address(usdc), amount, address(this), 0);
    }

    function getTotalBalance() external view override returns (uint256) {
        // Aave's aToken balance increases automatically every second
        return aUsdc.balanceOf(address(this)); 
    }
    
    // ... withdraw logic calls aavePool.withdraw()
}
```

**Key Takeaway:** With Aave, your *balance* of tokens increases. 100 aUSDC becomes 101 aUSDC.

---

## Option 2: Integrating Yield Yak

Yield Yak is an "Auto-Compounder". When you deposit, it puts your funds into a farm (like Aave or Benqi), sells the rewards (like WAVAX), and buys *more* of the underlying asset.

### 1. The Concept
Yield Yak gives you **receipt tokens** (e.g., `YRT`). Unlike Aave, the *amount* of YRT you hold stays the same. Instead, the **value** of each YRT increases.
*   Day 1: 1 YRT = 1.00 AVAX
*   Day 30: 1 YRT = 1.05 AVAX

### 2. The Interface
```solidity
interface IYakVault {
    function deposit(uint256 amount) external;
    function withdraw(uint256 shares) external;
    function totalAssets() external view returns (uint256);
    function totalSupply() external view returns (uint256);
}
```

### 3. The Strategy Logic

```solidity
contract YakStrategy is IYieldStrategy {
    IYakVault public vault;

    function deposit(uint256 lottoId) external payable override {
        // If dealing with Native AVAX, we usually wrap it to WAVAX first
        // Then approve the vault
        wavax.approve(address(vault), msg.value);
        
        // Deposit into Yak
        vault.deposit(msg.value);
    }

    function getTotalBalance() external view override returns (uint256) {
        // Calculate value: (Our Shares * Total Assets in Vault) / Total Shares
        uint256 ourShares = vault.balanceOf(address(this));
        uint256 pricePerShare = (vault.totalAssets() * 1e18) / vault.totalSupply();
        return (ourShares * pricePerShare) / 1e18;
    }
}
```

**Key Takeaway:** With Yield Yak, your *share count* stays flat, but the *exchange rate* changes.

---

## Comparison

| Feature | Aave (Lending) | Yield Yak (Aggregator) |
| :--- | :--- | :--- |
| **Risk** | Lower (Blue chip protocol) | Higher (Smart contract risk of underlying farms) |
| **APY** | Generally lower, stable | Generally higher, variable |
| **Mechanism** | Balance increases (Rebasing) | Price increases (Appreciating) |
| **Complexity** | Medium (Need to handle specific gateways for ETH/AVAX) | Low (Single vault interface) |

## Implementation Steps
1.  **Choose a Protocol:** For learning, Aave is often better documented.
2.  **Find Addresses:** Look up the "Contract Addresses" in the docs for Avalanche Mainnet (or Fuji Testnet).
3.  **Create Interface Files:** Copy the function definitions into `contracts/interfaces/`.
4.  **Write Strategy:** Create `contracts/strategies/AaveStrategy.sol` inheriting `IYieldStrategy`.
5.  **Test:** Use **Mainnet Forking** in Hardhat. This simulates running your test on the real Avalanche network without spending real money.
