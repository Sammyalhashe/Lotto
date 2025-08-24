// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Lotto} from "./Counter.sol";
import {Test} from "forge-std/Test.sol";

// Solidity tests are compatible with foundry, so they
// use the same syntax and offer the same functionality.

contract LottoTest is Test {
  Lotto lotto;

  function setUp() public {
    lotto = new Lotto(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
  }

  function test_InitialValue() public view {
    require(lotto.d_counter() == 0, "Initial counter value should be 0");
  }

  function testFuzz_Inc(uint256 x) public {
    // vm.expectRevert();
    lotto.launch(x);
    uint256 depositAmount;
    (,,depositAmount,) = lotto.d_lottos(lotto.d_counter());
    require(depositAmount == x, "Deposit amounts should match");
  }
}
