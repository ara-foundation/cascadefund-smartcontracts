import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TestTokenModule = buildModule("TestTokenModule", (m) => {
  const minter = m.getAccount(0);
  const name = "FakeUSDC";
  const symbol = "fUSDC";

  const contract = m.contract("TestToken", [minter, name, symbol]);

  return { contract };
});

export default TestTokenModule;
