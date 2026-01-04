import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

const LottoModule = buildModule("LottoModule", (m) => {
  const ticketPrice = m.getParameter("ticketPrice", parseEther("1")); // Default 1 AVAX
  const duration = m.getParameter("duration", 60n * 60n); // Default 1 hour

  const lotto = m.contract("Lotto", [ticketPrice, duration]);

  return { lotto };
});

export default LottoModule;
