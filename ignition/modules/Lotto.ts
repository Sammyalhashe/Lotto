import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LottoModule = buildModule("LottoModule", (m) => {
  // 1. Deploy the Strategy first
  const strategy = m.contract("MockYieldStrategy");

  // 2. Deploy the Lotto Manager, passing the Strategy address
  const lotto = m.contract("Lotto", [strategy]);

  return { strategy, lotto };
});

export default LottoModule;
