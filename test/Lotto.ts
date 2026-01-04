import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { parseEther } from "viem";

describe("Lotto Manager", async function () {
  let publicClient;
  let deployer;
  let player1;
  let player2;
  let lottoContract;

  before(async () => {
    const { viem } = await network.connect();
    publicClient = await viem.getPublicClient();
    const clients = await viem.getWalletClients();
    deployer = clients[0];
    player1 = clients[1];
    player2 = clients[2];

    lottoContract = await viem.deployContract("Lotto");
  });

  it("Should create a new lottery", async function () {
    await lottoContract.write.createLottery([parseEther("1"), 3600n]); // 1 AVAX, 1 hour
    
    const count = await lottoContract.read.getLotteryCount();
    assert.equal(count, 1n);

    const lotto = await lottoContract.read.getLottery([0n]);
    // id, owner, price, end, count, picked, winner, prize
    assert.equal(lotto[0], 0n);
    assert.equal(lotto[1].toLowerCase(), deployer.account.address.toLowerCase());
    assert.equal(lotto[2], parseEther("1"));
  });

  it("Should allow entering a specific lottery", async function () {
    const { viem } = await network.connect();
    const lottoAsPlayer1 = await viem.getContractAt(
      "Lotto",
      lottoContract.address,
      { client: { wallet: player1 } }
    );

    await lottoAsPlayer1.write.enterLottery([0n], { value: parseEther("1") });
    
    const lotto = await lottoContract.read.getLottery([0n]);
    assert.equal(lotto[4], 1n); // playerCount
  });

  it("Should track created lotteries for user", async function () {
    const created = await lottoContract.read.getCreatorLotteries([deployer.account.address]);
    assert.equal(created.length, 1);
    assert.equal(created[0], 0n);
  });

  it("Should track joined lotteries for player", async function () {
    const joined = await lottoContract.read.getPlayerLotteries([player1.account.address]);
    assert.equal(joined.length, 1);
    assert.equal(joined[0], 0n);
  });
});