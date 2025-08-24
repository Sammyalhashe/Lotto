// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IERC20 {
  function transfer(address, uint256) external returns (bool);
  function transferFrom(address, address, uint256) external returns (bool);
}

contract Lotto {
  /* EVENTS */
  event LottoStart(uint256 id, address indexed creator, uint256 depositSize);
  event LottoEnd(uint256 id, address indexed creator, address indexed winner, uint256 poolAmount, bool finished);
  event LottoJoin(uint256 id, address indexed participant);

  /* TYPES */
  struct LottoDetails {
    uint256   d_id;
    address   d_creator;
    uint256   d_depositAmount;
    address[] d_participants;
    bool      d_isDone;
  }

  /* MEMBER VARS */
  IERC20                           public immutable d_token;
  uint256                          public           d_counter;
  bool                             public           d_lottoInProgress;
  mapping(uint256 => LottoDetails) public           d_lottos;

  /* CREATOR */
  constructor(address token) {
    d_counter         = 0;
    d_token           = IERC20(token);
    d_lottoInProgress = false;
  }


  /* EXTERNAL */
  function launch(uint256 amount) external {
    require(!d_lottoInProgress, "Lotto already started!");

    d_lottoInProgress = true;
    
    LottoDetails storage details    = d_lottos[d_counter + 1];
    details.d_creator       = msg.sender;
    details.d_depositAmount = amount;
    details.d_id            = d_counter + 1;
    details.d_isDone        = false;

    emit LottoStart(++d_counter, msg.sender, amount);
  }

  function cancel() external {
    require(d_lottoInProgress, "No lotto in progress!");
    require(d_lottos[d_counter].d_creator == msg.sender, "Only the creator of the lotto can end it!");

    d_lottoInProgress            = false;
    d_lottos[d_counter].d_isDone = true;

    emit LottoEnd(d_lottos[d_counter].d_id, d_lottos[d_counter].d_creator, address(0x0), 0, false);
  }

  /* INTERNAL */
}
