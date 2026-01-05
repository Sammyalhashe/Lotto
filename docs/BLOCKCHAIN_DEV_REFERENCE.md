# Blockchain Development Reference

This guide is designed to help you navigate the blockchain development ecosystem used in the AVAX Lotto project. It is organized from **language fundamentals** to **tooling** and **workflows**.

## Stack Overview
*   **Language:** Solidity (Smart Contracts) & TypeScript (Tests/Scripts)
*   **Framework:** Hardhat (Development Environment)
*   **Interaction:** Viem (Lightweight library to talk to the blockchain)
*   **Deployment:** Hardhat Ignition

---

## Part 1: Solidity Essentials (The Language)

Solidity is the object-oriented language for writing smart contracts.

### 1.1. Core Data Types
*   `bool`: `true` or `false`.
*   `uint` / `int`: Unsigned (positive only) and signed integers. `uint256` is the standard (alias `uint`).
    *   *Note:* No decimals/floats! Use "Wei" (18 decimals) for currency.
*   `address`: Holds a 20-byte Ethereum address.
    *   `address payable`: Can receive Ether via `.transfer()` or `.send()`.
*   `bytes` / `string`: Arbitrary data or text.
*   **Data Structures:**
    *   `struct`: Custom objects (e.g., `struct User { uint id; uint balance; }`).
    *   `enum`: Restricted set of values (e.g., `enum Status { Pending, Active, Done }`).

### 1.2. Storage vs. Memory vs. Calldata (Important!)
Unlike standard programming, you must specify *where* data is stored.
*   **`storage`:** Permanent data on the blockchain. State variables are `storage` by default. **Very expensive** (Gas cost).
*   **`memory`:** Temporary data during function execution. Erased after function ends. **Cheaper**.
*   **`calldata`:** Read-only location for function arguments. **Cheapest**.
    *   *Tip:* Use `calldata` for external function arguments (e.g., `function verify(string calldata _proof)`).

### 1.3. Mappings vs. Arrays
*   **`mapping(address => uint)`:** Key-value store. O(1) access.
    *   *Pros:* Fast, cheap.
    *   *Cons:* Cannot iterate (loop) through keys. You can't say "get all users".
*   **`address[]`:** Array.
    *   *Pros:* Can iterate. Has `.length`.
    *   *Cons:* Expensive to resize or search if large. Avoid large loops in transactions!

### 1.4. Global Variables (The Blockchain Context)
Variables automatically available in every function.
*   **`msg.sender`**: The address calling the function. **Crucial for access control.**
    *   *In Constructor:* It's the deployer (owner).
*   **`msg.value`**: Amount of Wei (Ether) sent with the transaction.
*   **`block.timestamp`**: Current block time (in seconds).
*   **`tx.origin`**: The original sender. **Avoid** using this for security checks; use `msg.sender`.

### 1.5. Functions & Visibility
Control who can call your functions.
*   `public`: Callable by anyone (inside or outside).
*   `external`: Callable *only* from outside. More gas-efficient for large arguments.
*   `internal`: Callable only by this contract or inheriting contracts.
*   `private`: Callable only by this contract (not even inheritors).

### 1.6. Modifiers
Keywords that change function behavior.
*   **Behavioral:**
    *   `view`: Reads state but doesn't change it. Free to call off-chain.
    *   `pure`: Doesn't even read state (e.g., math helpers). Free to call off-chain.
    *   `payable`: Allows function to accept Ether.
*   **Custom Modifiers:** Reusable checks (e.g., `onlyOwner`).
    *   **The `_;` Wildcard:** Represents the *body* of the function being modified.
    ```solidity
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _; // <--- The function code executes here!
    }
    ```

### 1.7. Events (`indexed`)
Logs stored on the blockchain, cheaper than storage. Used by frontends to update UIs.
*   `event WinnerPicked(address indexed winner, uint amount);`
*   **`indexed`**: Adds the parameter to a special search structure (Bloom filter), allowing efficient filtering (e.g., "Find all wins by User X"). Limit: 3 indexed parameters.

### 1.8. Error Handling
*   `require(condition, "Message")`: If false, reverts transaction and refunds gas. Used for inputs/validation.
*   `revert CustomError()`: Gas-efficient way to stop execution (Solidity 0.8+).
*   `assert(condition)`: For internal errors that "should never happen". Consumes all gas. Avoid.

### 1.9. Special Functions
*   `receive() external payable`: Runs when contract receives ETH with *no data*.
*   `fallback() external payable`: Runs when contract receives ETH *with data* (or function doesn't exist).

---

## Part 2: Security Best Practices

### 2.1. Reentrancy
*   **Concept:** Attacker calls your function, and before you update their balance, they call it *again* recursively to drain funds.
*   **Fix 1 (Checks-Effects-Interactions):** Update internal state (balances) *before* sending ETH.
*   **Fix 2 (Reentrancy Guard):** Use a `nonReentrant` modifier to lock the function.

### 2.2. Isolating External Calls
*   **Pull over Push:** Don't send money to 100 people in a loop. If one fails, *everyone* fails. Instead, record that they are owed money and let them "withdraw" (pull) it themselves.
*   **Untrusted Contracts:** Always assume the address you are calling is malicious.

---

## Part 3: Tooling & Environment (Hardhat)

### 3.1. Useful Commands
*   `npx hardhat compile`: Check for syntax errors.
*   `npx hardhat test`: Run your test suite.
*   `npx hardhat node`: Start a local blockchain (simulates Avalanche).

### 3.2. Configuration (`hardhat.config.ts`)
Where you define Solidity versions and network connections.
*   **Networks:** To deploy to Fuji (Testnet), you'll add the URL and Private Key (via `vars`) here.

---

## Part 4: Testing & Interaction (Viem)

We use **Viem** (via `hardhat-toolbox-viem`) to interact with our contracts in tests and scripts.

### 4.1. Setup (in `test/*.ts`)
```typescript
import { network } from "hardhat";
// ... inside a test block
const { viem } = await network.connect();
const myContract = await viem.deployContract("Lotto", [arg1]);
```

### 4.2. Reading & Writing
*   **Write (Changes State):** `await myContract.write.functionName([args])`
*   **Read (View Only):** `await myContract.read.functionName([args])`

### 4.3. Utilities
*   **`parseEther("1.0")`**: Converts "1.0" to `1000000000000000000` (Wei).
*   **`formatEther(bigInt)`**: The reverse.
*   **`getAddress("0x...")`**: Fixes letter casing (Checksum).

---

## Part 5: Deployment (Ignition)

Deployment scripts are "Modules" in `ignition/modules/`.

```typescript
// ignition/modules/Lotto.ts
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("LottoModule", (m) => {
    // Deploy dependencies first
    const strategy = m.contract("MockYieldStrategy");
    // Pass dependency as argument
    const lotto = m.contract("Lotto", [strategy]);
    
    return { lotto };
});
```
**Run it:** `npx hardhat ignition deploy ignition/modules/Lotto.ts --network localhost`
