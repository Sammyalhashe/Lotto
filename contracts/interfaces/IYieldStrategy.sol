// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IYieldStrategy {
    /// @notice Deposits funds into the yield source
    /// @dev Should track the deposit against the specific lottery ID if needed, 
    ///      but for this simple version, we pool everything.
    function deposit(uint256 _lotteryId) external payable;

    /// @notice Withdraws principal amount for a winner
    function withdrawPrincipal(uint256 _amount) external returns (uint256);

    /// @notice Withdraws yield (profit) for the owner
    function withdrawYield(uint256 _amount) external returns (uint256);

    /// @notice Returns total value held by strategy
    function getTotalBalance() external view returns (uint256);
}
