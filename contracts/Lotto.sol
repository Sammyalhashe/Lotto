// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract Lotto {
    struct LotteryInfo {
        uint256 id;
        address owner;
        uint256 ticketPrice;
        uint256 endTime;
        address[] players;
        bool winnerPicked;
        address winner;
        uint256 prizeAmount;
    }

    uint256 public nextLotteryId;
    mapping(uint256 => LotteryInfo) public lotteries;
    
    // Indexing
    mapping(address => uint256[]) public creatorLotteries;
    mapping(address => uint256[]) public playerLotteries;
    mapping(address => mapping(uint256 => bool)) private hasJoined; // To prevent duplicate IDs in playerLotteries

    event LotteryCreated(uint256 indexed id, address indexed owner, uint256 ticketPrice, uint256 endTime);
    event PlayerEntered(uint256 indexed id, address indexed player);
    event WinnerPicked(uint256 indexed id, address indexed winner, uint256 amount);

    function createLottery(uint256 _ticketPrice, uint256 _duration) external {
        require(_duration > 0, "Duration must be > 0");
        
        uint256 id = nextLotteryId++;
        LotteryInfo storage lotto = lotteries[id];
        
        lotto.id = id;
        lotto.owner = msg.sender;
        lotto.ticketPrice = _ticketPrice;
        lotto.endTime = block.timestamp + _duration;
        lotto.winnerPicked = false;

        creatorLotteries[msg.sender].push(id);
        
        emit LotteryCreated(id, msg.sender, _ticketPrice, lotto.endTime);
    }

    function enterLottery(uint256 _id) external payable {
        LotteryInfo storage lotto = lotteries[_id];
        
        require(lotto.endTime > 0, "Lottery does not exist");
        require(block.timestamp < lotto.endTime, "Lottery has ended");
        require(!lotto.winnerPicked, "Winner already picked");
        require(msg.value == lotto.ticketPrice, "Incorrect ticket price");

        lotto.players.push(msg.sender);
        
        // Track unique lottery joins for the player
        if (!hasJoined[msg.sender][_id]) {
            hasJoined[msg.sender][_id] = true;
            playerLotteries[msg.sender].push(_id);
        }

        emit PlayerEntered(_id, msg.sender);
    }

    function pickWinner(uint256 _id) external {
        LotteryInfo storage lotto = lotteries[_id];
        
        require(msg.sender == lotto.owner, "Only owner can pick winner");
        require(block.timestamp >= lotto.endTime, "Lottery is still ongoing");
        require(!lotto.winnerPicked, "Winner already picked");
        require(lotto.players.length > 0, "No players entered");

        // Pseudo-randomness
        uint256 randomIndex = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, lotto.players.length))) % lotto.players.length;
        address winner = lotto.players[randomIndex];

        uint256 totalPrincipal = lotto.players.length * lotto.ticketPrice;
        uint256 contractBalance = address(this).balance;

        // Simple check to ensure we have enough funds (though global balance pools everything)
        // Ideally we would track balance per lottery, but for this simple version assuming solvent
        require(contractBalance >= totalPrincipal, "Insufficient contract balance");

        // Yield calculation (Global concept)
        // In this multi-lotto version, tracking exact yield per lotto is complex without separate vaults.
        // We will just pay out the Principal to winner. Any excess in the contract technically belongs to...
        // For this MVP, we focus on the Principal payout.
        
        lotto.winnerPicked = true;
        lotto.winner = winner;
        lotto.prizeAmount = totalPrincipal;

        // Transfer Prize
        (bool success, ) = winner.call{value: totalPrincipal}("");
        require(success, "Prize transfer failed");

        // Note: Yield extraction logic is simplified out for this Multi-Lotto MVP 
        // to avoid accounting errors between different lottos pooling in one address.

        emit WinnerPicked(_id, winner, totalPrincipal);
    }

    // --- Views ---

    function getLottery(uint256 _id) external view returns (
        uint256 id, 
        address owner, 
        uint256 ticketPrice, 
        uint256 endTime, 
        uint256 playerCount, 
        bool winnerPicked, 
        address winner,
        uint256 prizeAmount
    ) {
        LotteryInfo storage lotto = lotteries[_id];
        return (
            lotto.id,
            lotto.owner,
            lotto.ticketPrice,
            lotto.endTime,
            lotto.players.length,
            lotto.winnerPicked,
            lotto.winner,
            lotto.prizeAmount
        );
    }

    // Returns array of IDs created by user
    function getCreatorLotteries(address _creator) external view returns (uint256[] memory) {
        return creatorLotteries[_creator];
    }

    // Returns array of IDs joined by user
    function getPlayerLotteries(address _player) external view returns (uint256[] memory) {
        return playerLotteries[_player];
    }
    
    // Helper to get total count
    function getLotteryCount() external view returns (uint256) {
        return nextLotteryId;
    }
}
