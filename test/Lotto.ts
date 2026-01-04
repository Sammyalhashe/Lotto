import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { parseEther } from "viem";

describe("Lotto Manager with Yield Strategy", async function () {
  let publicClient;
  let deployer;
  let player1;
  let player2;
  let lottoContract;
  let strategyContract;
  let testClient;

  before(async () => {
    const { viem } = await network.connect();
    publicClient = await viem.getPublicClient();
    testClient = await viem.getTestClient();
    const clients = await viem.getWalletClients();
    deployer = clients[0];
    player1 = clients[1];
    player2 = clients[2];

    strategyContract = await viem.deployContract("MockYieldStrategy");
    lottoContract = await viem.deployContract("Lotto", [strategyContract.address]);
  });

  it("Should create a new lottery", async function () {
    await lottoContract.write.createLottery([parseEther("1"), 3600n]); // 1 AVAX, 1 hour
    const count = await lottoContract.read.getLotteryCount();
    assert.equal(count, 1n);
  });

  it("Should forward funds to Strategy on enter", async function () {
    const { viem } = await network.connect();
    const lottoAsPlayer1 = await viem.getContractAt(
      "Lotto",
      lottoContract.address,
      { client: { wallet: player1 } }
    );

    // Initial Strategy Balance
    const initialBal = await publicClient.getBalance({ address: strategyContract.address });
    assert.equal(initialBal, 0n);

    // Enter
    await lottoAsPlayer1.write.enterLottery([0n], { value: parseEther("1") });
    
    // Check Strategy Balance increased
    const finalBal = await publicClient.getBalance({ address: strategyContract.address });
    assert.equal(finalBal, parseEther("1"));
  });

  it("Should allow picking winner and withdrawing principal from strategy", async function () {
    // Fast forward time
    // In Hardhat network with Viem
    await testClient.increaseTime({ seconds: 3601 });
    await testClient.mine({ blocks: 1 });

    const winnerInitialBal = await publicClient.getBalance({ address: player1.account.address });

    // Pick Winner (Deployer is owner)
    await lottoContract.write.pickWinner([0n]);

    const winnerFinalBal = await publicClient.getBalance({ address: player1.account.address });
    
    // Winner should get the 1 AVAX back (minus gas costs if they were the caller, but deployer called it)
    // Actually, winner is Player1, Deployer called pickWinner.
    // So Player1 balance should strictly increase by 1 AVAX.
    
    assert.equal(winnerFinalBal - winnerInitialBal, parseEther("1"));
    
    // Strategy should be empty
    const stratBal = await publicClient.getBalance({ address: strategyContract.address });
    assert.equal(stratBal, 0n);
  });
});
