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
        // The strategy will hold them and (theoretically) earn yield
        yieldStrategy.deposit{value: msg.value}(_id);

        emit PlayerEntered(_id, msg.sender);
    }

    function pickWinner(uint256 _id) external {
        LotteryInfo storage lotto = lotteries[_id];
        
        require(msg.sender == lotto.owner, "Only owner can pick winner");
        require(block.timestamp >= lotto.endTime, "Lottery is still ongoing");
        require(!lotto.winnerPicked, "Winner already picked");
        require(lotto.players.length > 0, "No players entered");

        // 1. Pick Winner (Pseudo-random)
        uint256 randomIndex = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, lotto.players.length))) % lotto.players.length;
        address winner = lotto.players[randomIndex];

        // 2. Calculate Amounts
        uint256 totalPrincipal = lotto.players.length * lotto.ticketPrice;
        
        // We assume the Strategy holds *at least* the principal.
        // In a real scenario, we'd check strategy balance.
        // Any balance ABOVE principal (allocated to this lotto) would be yield.
        // *Simplification for MVP*: 
        // We don't track exact yield-per-lotto in the strategy.
        // We will just withdraw Principal for the winner.
        // Any 'Global' yield in the strategy is currently hard to attribute to a specific lotto
        // without a more complex Vault system (ERC4626).
        // 
        // For this Demo: We will fetch the Principal from Strategy -> Winner.
        // We will *check* if there is extra balance in the strategy proportional to this lotto?
        // No, that's too complex. 
        // New Plan:
        // We withdraw `totalPrincipal` for the Winner.
        // Then we check if the Strategy has EXTRA balance available *right now*? 
        // No, that would drain other lottos.
        //
        // *Revised Yield Logic for MVP Multi-Lotto*:
        // Implementation of per-lotto yield is very hard without ERC4626 shares.
        // WE WILL ONLY WITHDRAW PRINCIPAL.
        // The "Yield" will remain in the strategy for this MVP iteration unless we implement shares.
        // 
        // Wait! I can implement a simpler logic:
        // When picking winner, we withdraw `Principal` -> Winner.
        // We also allow the Owner to withdraw a fixed "Yield" amount IF the strategy allows it?
        // No.
        // 
        // Let's implement this: 
        // The Owner gets any *surplus* balance that exists in the Strategy *attributed* to this lotto?
        // Impossible to know without shares.
        // 
        // *Pivot*: We will behave as if the Strategy earned X% yield and try to withdraw `Principal + Yield`.
        // If Strategy has enough, we send Principal to Winner, Yield to Owner.
        // Since `MockYieldStrategy` pools everything, we will just simulate a "claim" of 
        // whatever extra ETH is in the strategy proportional to the lotto size?
        //
        // Let's stick to the SAFEST path for a learning project:
        // 1. Withdraw Principal -> Pay Winner.
        // 2. If Strategy Balance > Total Global Principal (tracked in strategy), the excess is Yield.
        //    (The simple MockStrategy currently tracks `totalDeposited`).
        //    We can check `strategy.balance - strategy.totalDeposited`.
        //    We can payout a *share* of that global yield to this lotto owner.
        //    Share = (LottoPrincipal / TotalDeposited) * TotalYield.

        uint256 stratBalance = yieldStrategy.getTotalBalance();
        // We need `totalDeposited` from strategy to know global principal
        // Let's add `totalDeposited` to interface? No, we cast to Mock for this demo logic 
        // or just rely on the fact that for this demo, usually only one lotto runs.
        
        // Let's keep it simple: Just Pay Principal to Winner. 
        // Yield optimization is a "Next Step" unless I change the Strategy Interface to returns Stats.
        //
        // Let's update `IYieldStrategy` to help us. 
        // I will update the interface in the next step to include `totalDeposited`.
        
        // ...Wait, I can't update the interface mid-execution of this thought process easily.
        // I will assume for now we just pay principal.
        
        lotto.winnerPicked = true;
        lotto.winner = winner;
        lotto.prizeAmount = totalPrincipal;

        // Withdraw Principal from Strategy to THIS contract
        yieldStrategy.withdrawPrincipal(totalPrincipal);
        
        // Send Principal to Winner
        (bool success, ) = winner.call{value: totalPrincipal}("");
        require(success, "Prize transfer failed");

        emit WinnerPicked(_id, winner, totalPrincipal, 0);
    }
    
    // Allow receiving ETH from the Strategy (withdrawals)
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