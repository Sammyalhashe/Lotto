// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract Lotto {
    address public owner;
    uint256 public ticketPrice;
    uint256 public lotteryDuration;
    uint256 public lotteryEndTime;
    address[] public players;
    
    event Entered(address indexed player);
    event WinnerPicked(address indexed winner, uint256 amount);
    event YieldWithdrawn(uint256 amount);

    constructor(uint256 _ticketPrice, uint256 _lotteryDuration) {
        owner = msg.sender;
        ticketPrice = _ticketPrice;
        lotteryDuration = _lotteryDuration;
        lotteryEndTime = block.timestamp + _lotteryDuration;
    }

    function enter() external payable {
        require(block.timestamp < lotteryEndTime, "Lottery has ended");
        require(msg.value == ticketPrice, "Incorrect ticket price");

        players.push(msg.sender);
        emit Entered(msg.sender);
    }

    function pickWinner() external {
        require(block.timestamp >= lotteryEndTime, "Lottery is still ongoing");
        require(players.length > 0, "No players entered");
        
        // Pseudo-randomness (Not safe for production!)
        uint256 randomIndex = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, players.length))) % players.length;
        address winner = players[randomIndex];

        // Calculate pool and yield
        // In a real yield scenario, contract balance > players.length * ticketPrice
        uint256 totalPrincipal = players.length * ticketPrice;
        uint256 contractBalance = address(this).balance;
        
        uint256 yieldAmount = 0;
        if (contractBalance > totalPrincipal) {
            yieldAmount = contractBalance - totalPrincipal;
        }

        // Reset state before transfer to prevent re-entrancy (Checks-Effects-Interactions)
        delete players;
        lotteryEndTime = block.timestamp + lotteryDuration;

        // Transfer prize to winner
        (bool successPrize, ) = winner.call{value: totalPrincipal}("");
        require(successPrize, "Prize transfer failed");

        // Transfer yield to owner
        if (yieldAmount > 0) {
            (bool successYield, ) = owner.call{value: yieldAmount}("");
            require(successYield, "Yield transfer failed");
        }

        emit WinnerPicked(winner, totalPrincipal);
        if (yieldAmount > 0) {
            emit YieldWithdrawn(yieldAmount);
        }
    }

    // Function to simulate yield generation (anyone can donate to the pot for testing yield)
    receive() external payable {}
}
