// We don't have Ethereum specific assertions in Hardhat 3 yet
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

describe("Lotto", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  it("Should emit the LottoStart event when calling the launch() function", async function () {
    const lotto = await viem.deployContract("Lotto", [
      "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    ]);

    await viem.assertions.emitWithArgs(
      lotto.write.launch([10n]),
      lotto,
      "LottoStart",
      [1n, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", 10n],
    );
  });

  it("Sould emit the LottoEnd event when calling cancel()", async function () {
    const lotto = await viem.deployContract("Lotto", [
      "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    ]);

    await viem.assertions.emit(lotto.write.launch([10n]), lotto, "LottoStart");

    await viem.assertions.emitWithArgs(
      lotto.write.cancel(),
      lotto,
      "LottoEnd",
      [
        1n,
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        "0x0000000000000000000000000000000000000000",
        0n,
        false,
      ],
    );
  });
});
