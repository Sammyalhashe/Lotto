# Building a Decentralized Lottery on Avalanche

This document tracks the development process of the Lotto dApp, designed to facilitate learning blockchain development.

## Tech Stack Choices

*   **Blockchain:** Avalanche (AVAX) - Chosen for high throughput and community adoption.
*   **Smart Contract Framework:** Hardhat - Industry standard for Ethereum/EVM development.
*   **Interaction Library:** Viem - A modern, lightweight, and type-safe alternative to Ethers.js.
*   **Frontend:** React (via Vite) - Fast and popular web framework.

## Architecture

### Smart Contract (`Lotto.sol`)

The core logic resides here.
*   **State Variables:**
    *   `ticketPrice`: Cost to enter.
    *   `lotteryEnd`: Timestamp when the lottery closes.
    *   `players`: Array of addresses that entered.
*   **Functions:**
    *   `enter()`: Payable function to join.
    *   `pickWinner()`: Selects a winner and transfers funds.

### Randomness Note
True randomness is difficult on deterministic blockchains. In production, we would use **Chainlink VRF** (Verifiable Random Function). For this learning exercise, we will use a pseudo-random number generator using block difficulty/timestamp. **Warning:** This is exploitable by miners/validators in high-stakes environments but acceptable for a simple learning project.

### Yield Strategy (Stretch Goal)
To separate concerns, we can use a "Strategy" pattern. The Lotto contract holds funds, but delegate them to a strategy contract that interacts with Aave/Benqi. For the MVP, we will use a `BasicStrategy` that just holds the funds.

## Development Log
1.  **Setup:** Initialized Hardhat project with Viem.
2.  **Contract:** Implemented `Lotto.sol` with entry and winner picking logic.
3.  **Testing:** Wrote and verified tests in `test/Lotto.ts` covering:
    *   Deployment parameters.
    *   Player entry.
    *   Ticket price validation.
4.  **Frontend:** Scaffolding React application...

