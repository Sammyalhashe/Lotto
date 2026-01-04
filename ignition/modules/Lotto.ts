import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LottoModule = buildModule("LottoModule", (m) => {
  // No constructor args needed for the Manager style contract
  const lotto = m.contract("Lotto");

  return { lotto };
});

export default LottoModule;