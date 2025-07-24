import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const StringUtilsModule = buildModule("StringUtilsModule", (m) => {
  const contract = m.library("StringUtils");

  return { contract };
});

export default StringUtilsModule;
