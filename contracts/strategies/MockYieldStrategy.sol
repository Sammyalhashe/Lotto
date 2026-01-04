// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "../interfaces/IYieldStrategy.sol";

/// @title Mock Yield Strategy
/// @notice Simulates a yield-bearing protocol (like Aave or Benqi) for testing.
/// @dev In production, this would be replaced by an adapter calling actual protocol functions.
contract MockYieldStrategy is IYieldStrategy {
    uint256 public totalDeposited;
    
    // We treat the contract's ETH balance as the "Protocol Balance".
    // If we send extra ETH to this contract without calling deposit(), 
    // it simulates "interest" accruing.

    event Deposited(uint256 lotteryId, uint256 amount);
    event Withdrawn(address to, uint256 amount, string amountType);

    function deposit(uint256 _lotteryId) external payable override {
        totalDeposited += msg.value;
        emit Deposited(_lotteryId, msg.value);
    }

    function withdrawPrincipal(uint256 _amount) external override returns (uint256) {
        require(_amount <= address(this).balance, "Insufficient funds in strategy");
        // Principal is limited by what was tracked as deposited
        // In a real strategy, this logic might be more complex (aTokens, etc.)
        
        if (_amount > totalDeposited) {
            totalDeposited = 0; 
        } else {
            totalDeposited -= _amount;
        }

        (bool sent, ) = msg.sender.call{value: _amount}("");
        require(sent, "Failed to send principal");
        
        emit Withdrawn(msg.sender, _amount, "PRINCIPAL");
        return _amount;
    }

    function withdrawYield(uint256 _amount) external override returns (uint256) {
        require(_amount <= address(this).balance, "Insufficient funds in strategy");
        
        // Yield withdrawal shouldn't affect the 'totalDeposited' principal tracking
        // unless we are eating into principal (which shouldn't happen for yield)
        
        (bool sent, ) = msg.sender.call{value: _amount}("");
        require(sent, "Failed to send yield");
        
        emit Withdrawn(msg.sender, _amount, "YIELD");
        return _amount;
    }

    function getTotalBalance() external view override returns (uint256) {
        return address(this).balance;
    }

    function getPrincipalBalance() external view override returns (uint256) {
        return totalDeposited;
    }

    /// @notice Magic function to simulate interest generation
    /// @dev Anyone can send funds here to simulate "Yield" appearing
    receive() external payable {}
}
