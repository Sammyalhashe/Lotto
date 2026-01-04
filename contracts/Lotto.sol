// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./interfaces/IYieldStrategy.sol";

contract Lotto {
    struct LotteryInfo {
        uint256 id;
        address owner;
        uint256 ticketPrice;
        uint256 endTime;
        address[] players;
        bool winnerPicked;
        address winner;
        uint256 prizeAmount;   // Principal paid to winner
        uint256 yieldGenerated; // Yield paid to owner
    }

    uint256 public nextLotteryId;
    mapping(uint256 => LotteryInfo) public lotteries;
    
    // The Strategy Contract where funds are kept
    IYieldStrategy public yieldStrategy;

    // Indexing
    mapping(address => uint256[]) public creatorLotteries;
    mapping(address => uint256[]) public playerLotteries;
    mapping(address => mapping(uint256 => bool)) private hasJoined;

    event LotteryCreated(uint256 indexed id, address indexed owner, uint256 ticketPrice, uint256 endTime);
    event PlayerEntered(uint256 indexed id, address indexed player);
    event WinnerPicked(uint256 indexed id, address indexed winner, uint256 prize, uint256 yield);

    constructor(address _strategy) {
        require(_strategy != address(0), "Invalid strategy address");
        yieldStrategy = IYieldStrategy(_strategy);
    }

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
        
        if (!hasJoined[msg.sender][_id]) {
            hasJoined[msg.sender][_id] = true;
            playerLotteries[msg.sender].push(_id);
        }

        // Forward funds to the Strategy immediately
        yieldStrategy.deposit{value: msg.value}(_id);

        emit PlayerEntered(_id, msg.sender);
    }

    function pickWinner(uint256 _id) external {
        LotteryInfo storage lotto = lotteries[_id];
        
        require(msg.sender == lotto.owner, "Only owner can pick winner");
        require(block.timestamp >= lotto.endTime, "Lottery is still ongoing");
        require(!lotto.winnerPicked, "Winner already picked");
        require(lotto.players.length > 0, "No players entered");

        // 1. Pick Winner
        uint256 randomIndex = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, lotto.players.length))) % lotto.players.length;
        address winner = lotto.players[randomIndex];

        // 2. Calculate Principal
        uint256 lottoPrincipal = lotto.players.length * lotto.ticketPrice;
        
        // 3. Calculate Yield Share
        // Proportional Share = (LottoPrincipal / GlobalPrincipal) * GlobalYield
        // Note: GlobalPrincipal includes THIS lotto's principal.
        
        uint256 globalPrincipal = yieldStrategy.getPrincipalBalance();
        uint256 globalTotal = yieldStrategy.getTotalBalance();
        
        uint256 yieldForOwner = 0;
        
        if (globalTotal > globalPrincipal && globalPrincipal > 0) {
            uint256 globalYield = globalTotal - globalPrincipal;
            // Precision handling: (Yield * LottoPrincipal) / GlobalPrincipal
            yieldForOwner = (globalYield * lottoPrincipal) / globalPrincipal;
        }

        lotto.winnerPicked = true;
        lotto.winner = winner;
        lotto.prizeAmount = lottoPrincipal;
        lotto.yieldGenerated = yieldForOwner;

        // 4. Withdraw Principal -> THIS -> Winner
        yieldStrategy.withdrawPrincipal(lottoPrincipal);
        (bool successPrize, ) = winner.call{value: lottoPrincipal}("");
        require(successPrize, "Prize transfer failed");

        // 5. Withdraw Yield -> THIS -> Owner
        if (yieldForOwner > 0) {
            yieldStrategy.withdrawYield(yieldForOwner);
            (bool successYield, ) = lotto.owner.call{value: yieldForOwner}("");
            require(successYield, "Yield transfer failed");
        }

        emit WinnerPicked(_id, winner, lottoPrincipal, yieldForOwner);
    }
    
    // Allow receiving ETH from the Strategy
    receive() external payable {}

    // --- Views ---

    function getLottery(uint256 _id) external view returns (
        uint256 id, 
        address owner, 
        uint256 ticketPrice, 
        uint256 endTime, 
        uint256 playerCount, 
        bool winnerPicked, 
        address winner,
        uint256 prizeAmount,
        uint256 yieldGenerated,
        uint256 currentYieldEstimate // New field for UI
    ) {
        LotteryInfo storage lotto = lotteries[_id];
        
        // Calculate Estimate (similar logic to pickWinner)
        uint256 estimate = 0;
        if (!lotto.winnerPicked && lotto.players.length > 0) {
             uint256 lottoPrincipal = lotto.players.length * lotto.ticketPrice;
             uint256 globalPrincipal = yieldStrategy.getPrincipalBalance();
             uint256 globalTotal = yieldStrategy.getTotalBalance();
             
             if (globalTotal > globalPrincipal && globalPrincipal > 0) {
                uint256 globalYield = globalTotal - globalPrincipal;
                estimate = (globalYield * lottoPrincipal) / globalPrincipal;
             }
        } else {
            estimate = lotto.yieldGenerated;
        }

        return (
            lotto.id,
            lotto.owner,
            lotto.ticketPrice,
            lotto.endTime,
            lotto.players.length,
            lotto.winnerPicked,
            lotto.winner,
            lotto.prizeAmount,
            lotto.yieldGenerated,
            estimate
        );
    }

    function getCreatorLotteries(address _creator) external view returns (uint256[] memory) {
        return creatorLotteries[_creator];
    }

    function getPlayerLotteries(address _player) external view returns (uint256[] memory) {
        return playerLotteries[_player];
    }
    
    function getLotteryCount() external view returns (uint256) {
        return nextLotteryId;
    }
}
