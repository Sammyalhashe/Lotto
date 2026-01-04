import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { parseEther } from "viem";

describe("Lotto Contract", async function () {
  let publicClient;
  let deployer;
  let player1;
  let player2;
  let lottoContract;
  let ticketPrice;
  let duration;

  before(async () => {
    const { viem } = await network.connect();
    publicClient = await viem.getPublicClient();
    const clients = await viem.getWalletClients();
    deployer = clients[0];
    player1 = clients[1];
    player2 = clients[2];

    ticketPrice = parseEther("1"); // 1 AVAX
    duration = 60n * 60n; // 1 hour

    lottoContract = await viem.deployContract("Lotto", [ticketPrice, duration]);
  });

  it("Should set the correct ticket price and duration", async function () {
    const price = await lottoContract.read.ticketPrice();
    const savedDuration = await lottoContract.read.lotteryDuration();
    
    assert.equal(price, ticketPrice);
    assert.equal(savedDuration, duration);
  });

  it("Should allow a player to enter", async function () {
    const { viem } = await network.connect();
    // Use player1 to enter
    const lottoAsPlayer1 = await viem.getContractAt(
      "Lotto",
      lottoContract.address,
      { client: { wallet: player1 } }
    );

    await lottoAsPlayer1.write.enter({ value: ticketPrice });
    
    const players = await lottoContract.read.players([0n]);
    assert.equal(players.toLowerCase(), player1.account.address.toLowerCase());
  });

  it("Should fail if ticket price is incorrect", async function () {
    const { viem } = await network.connect();
    const lottoAsPlayer2 = await viem.getContractAt(
      "Lotto",
      lottoContract.address,
      { client: { wallet: player2 } }
    );

    await assert.rejects(
        async () => {
            await lottoAsPlayer2.write.enter({ value: parseEther("0.5") });
        },
        (err: any) => err.message.includes("Incorrect ticket price")
    );
  });
});
