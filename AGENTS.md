# Agent Context & Project Constraints

This file documents the specific user intent, business logic, and constraints for the "AVAX Lotto" project. It serves as a reference for future development sessions to ensure alignment with the original vision.

## 1. Project Goal
*   **Primary Objective:** Education. The user is building this to learn blockchain development.
*   **Ecosystem:** Avalanche (AVAX). Chosen for adoption and transaction volume.

## 2. Core Mechanics (The "Lotto")
*   **Duration:** The lottery runs on a fixed cycle (e.g., monthly).
*   **Entry:**
    *   Users connect their wallet via a frontend.
    *   Users send a fixed amount of AVAX (or token) defined by the owner.
*   **Fund Security:**
    *   Funds are pooled in a dedicated contract/wallet.
    *   **Constraint:** Owners *cannot* withdraw the principal pool for themselves.
*   **Winning:**
    *   One winner is selected at random from the pool of contributors.
    *   The winner receives the **entire principal pool**.

## 3. Yield Generation (The "Twist")
*   **Concept:** While funds sit in the pool during the lottery duration, they should be utilized to generate yield (e.g., via Aave, Benqi, or other DeFi protocols).
*   **Incentive Structure:**
    *   **Winner:** Gets 100% of the *Principal* (the ticket money).
    *   **Owner:** Gets 100% of the *Yield* generated during the wait time.
*   **Implementation Status:** Currently, the contract has a placeholder logic for separating "principal" from "yield". Future iterations should integrate actual DeFi strategies (Yield Strategy Pattern).

## 4. Architecture
*   **Backend:** Solidity Smart Contract. Needs to be secure and handle the state of players and funds.
*   **Frontend:** React dApp. Needs to be simple, allowing wallet connection and interaction with the contract.

## 5. Development Philosophy
*   **Documentation:** Comprehensive documentation is required to explain *how* things work and *why* specific tools were used, supporting the learning objective.

## 6. Development Environment Setup (Nix)
*   **Tool:** Nix (with flakes).
*   **Purpose:** Ensures a reproducible development environment with all necessary dependencies (Node.js, Nushell, Solc) readily available.
*   **Usage:** To enter the development shell with all dependencies, use:
    ```bash
    nix develop --impure
    ```
    To run a command directly within the Nix-managed environment:
    ```bash
    nix develop --impure --command bash -c "YOUR_COMMAND_HERE"
    ```
*   **Nushell:** The `flake.nix` initially configured `nushell` as the default shell via `shellHook = 'exec nu'`, which can interfere with non-interactive commands. This has been updated to be more compatible with scripted execution. If future interactive use of `nu` is desired, the `shellHook` in `flake.nix` may need to be adjusted or invoked manually after `nix develop`.

## 7. Available Tools
The agent has access to the following tools for development and assistance:
*   `list_directory`: List files and subdirectories.
*   `read_file`: Read the content of a file.
*   `search_file_content`: Search for text patterns using `ripgrep`.
*   `glob`: Find files matching glob patterns.
*   `replace`: Replace text within a file (smart search & replace).
*   `write_file`: Write or overwrite a file.
*   `run_shell_command`: Execute shell commands (e.g., git, npm, nix).
*   `web_fetch`: Fetch content from URLs.
*   `save_memory`: Save key facts to long-term memory.
*   `google_web_search`: Perform Google searches.
*   `write_todos`: Manage a list of subtasks for complex requests.
*   `codebase_investigator`: Analyze the codebase structure and dependencies.

