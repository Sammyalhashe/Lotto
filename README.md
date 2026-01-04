# AVAX Lotto Learning Project

A decentralized lottery application built on Avalanche (AVAX) for educational purposes.

## Overview
This project demonstrates a full-stack dApp workflow:
1.  **Smart Contract:** `Lotto.sol` handles ticket purchases, pooling funds, and picking a pseudo-random winner.
2.  **Frontend:** A React + Vite + Tailwind CSS application that connects to the contract using `viem`.
3.  **Tooling:** Hardhat (v3 Beta) for development, testing, and deployment.

## Prerequisites
*   Node.js (v20+)
*   MetaMask (or similar wallet) installed in your browser.

## Getting Started

### 1. Install Dependencies
```bash
npm install
cd frontend
npm install
cd ..
```

### 2. Run Local Blockchain
Start a local Hardhat node to simulate the Avalanche network:
```bash
npx hardhat node
```
*Keep this terminal running.*

### 3. Deploy Contract
In a new terminal, deploy the contract to your local node:
```bash
npx hardhat ignition deploy ignition/modules/Lotto.ts --network localhost
```
**Important:** Copy the deployed contract address from the output.

### 4. Configure Frontend
1.  Open `frontend/src/App.tsx`.
2.  Update `CONTRACT_ADDRESS` with the address you just copied.
3.  (Optional) Import the provided private keys from `npx hardhat node` output into MetaMask to have funds for testing. Switch MetaMask network to `Localhost 8545`.

### 5. Run Frontend
```bash
cd frontend
npm run dev
```
Open the provided URL (usually `http://localhost:5173`) in your browser.

## Project Structure
*   `contracts/`: Solidity smart contracts.
*   `frontend/`: React application.
*   `test/`: Contract tests using `viem` and `node:test`.
*   `ignition/`: Deployment modules.
*   `docs/`: detailed learning guides.

## Features
*   **Enter Lottery:** Pay 1 AVAX (testnet/local) to enter.
*   **Pick Winner:** Owner can pick a winner when the duration ends.
*   **Yield (Concept):** The contract is structured to allow future integration with yield protocols.

## License
MIT