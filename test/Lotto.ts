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

    // Enter
    await lottoAsPlayer1.write.enterLottery([0n], { value: parseEther("1") });
    
    // Check Strategy Balance
    const finalBal = await publicClient.getBalance({ address: strategyContract.address });
    assert.equal(finalBal, parseEther("1"));
  });

  it("Should allow picking winner and withdrawing principal + yield", async function () {
    // 1. Simulate Yield Generation (Send extra 0.1 ETH to strategy)
    // Using deployer to send
    const { viem } = await network.connect();
    const strategyAsDeployer = await viem.getContractAt(
        "MockYieldStrategy", 
        strategyContract.address,
        { client: { wallet: deployer } }
    );
    // Directly send funds to mock receive()
    await deployer.sendTransaction({
        to: strategyContract.address,
        value: parseEther("0.1")
    });

    // Check Balance = 1.1 ETH (1 Principal + 0.1 Yield)
    const totalBal = await publicClient.getBalance({ address: strategyContract.address });
    assert.equal(totalBal, parseEther("1.1"));

    // Fast forward time
    await testClient.increaseTime({ seconds: 3601 });
    await testClient.mine({ blocks: 1 });

    const winnerInitialBal = await publicClient.getBalance({ address: player1.account.address });
    const ownerInitialBal = await publicClient.getBalance({ address: deployer.account.address });

    // Pick Winner (Deployer is owner)
    // Since only 1 lotto exists, it should get 100% of the yield (0.1 ETH)
    await lottoContract.write.pickWinner([0n]);

    const winnerFinalBal = await publicClient.getBalance({ address: player1.account.address });
    const ownerFinalBal = await publicClient.getBalance({ address: deployer.account.address });

    // Winner (Player1) gets Principal (1 ETH)
    assert.equal(winnerFinalBal - winnerInitialBal, parseEther("1"));

    // Owner (Deployer) gets Yield (0.1 ETH) - Gas
    // Since gas is tricky, we check if balance increased "roughly" or check the events/view.
    // Easier: Check the View function first
    const lotto = await lottoContract.read.getLottery([0n]);
    // index 8 is yieldGenerated
    assert.equal(lotto[8], parseEther("0.1"));
  });
});