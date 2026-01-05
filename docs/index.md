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
# OR if using Nix shell:
lotto-node
```
*Keep this terminal running.*

### 3. Deploy Contract
In a new terminal, deploy the contract to your local node:
```bash
npx hardhat ignition deploy ignition/modules/Lotto.ts --network localhost
# OR if using Nix shell:
lotto-deploy
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
# OR if using Nix shell:
lotto-ui
```
Open the provided URL (usually `http://localhost:5173`) in your browser.

### 6. Wallet Configuration & Funds (Crucial!)
To interact with the dApp, your wallet (Core or MetaMask) must be connected to your local Hardhat node.

1.  **Add Network:**
    *   **Network Name:** Localhost 8545
    *   **RPC URL:** `http://127.0.0.1:8545`
    *   **Chain ID:** `31337`
    *   **Currency Symbol:** `AVAX` (or ETH)

2.  **Get Test Funds:**
    *   Look at the terminal running `lotto-node` (or `npx hardhat node`).
    *   It lists 20 accounts with 10,000 ETH/AVAX each.
    *   Copy a **Private Key** from that list (e.g., `0xac09...`).
    *   In your wallet, select **"Import Account"** (or "Add Account" -> "Import Private Key") and paste the key.
    *   **Note:** Never use a real mainnet private key for development!

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

## Deployment to Production (Avalanche Fuji Testnet / Mainnet)

### 1. Smart Contract Deployment
To deploy to a live network like the Avalanche Fuji Testnet:

1.  **Set Environment Variables:**
    Use Hardhat's configuration variables to securely store your private key and RPC URL.
    ```bash
    npx hardhat vars set FUJI_PRIVATE_KEY
    # Enter your private key (must have AVAX for gas)
    ```

2.  **Configure Network:**
    Update `hardhat.config.ts` to include the network:
    ```typescript
    import { vars } from "hardhat/config";
    
    const FUJI_PRIVATE_KEY = vars.get("FUJI_PRIVATE_KEY");

    // ... inside config object
    networks: {
      fuji: {
        url: "https://api.avax-test.network/ext/bc/C/rpc",
        accounts: [FUJI_PRIVATE_KEY],
      },
    },
    ```

3.  **Deploy:**
    ```bash
    npx hardhat ignition deploy ignition/modules/Lotto.ts --network fuji
    ```

### 2. Frontend Deployment
1.  **Update Contract Address:**
    Update `frontend/src/App.tsx` with the new address from the Fuji deployment.

2.  **Update Chain Config:**
    In `App.tsx`, change the `chain` from `hardhat` to `avalancheFuji`:
    ```typescript
    import { avalancheFuji } from 'viem/chains';
    // ... use avalancheFuji in createPublicClient and createWalletClient
    ```

3.  **Build:**
    ```bash
    cd frontend
    npm run build
    ```
    This creates a `dist/` folder containing static files ready to be hosted on Vercel, Netlify, or GitHub Pages.

## License
MIT
