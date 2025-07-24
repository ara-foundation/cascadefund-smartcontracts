import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const HyperpaymentV1Module = buildModule("HyperpaymentV1Module", (m) => {
  const proxyAdminOwner = m.getAccount(0);
  const stringUtils = m.library("StringUtils");

  const contract = m.contract("HyperpaymentV1", [], {
    libraries: {
      "StringUtils": stringUtils
    }
  });

  const encodedFunctionCall = m.encodeFunctionCall(contract, "initialize", []);

  const proxy = m.contract("TransparentUpgradeableProxy", [
    contract,
    proxyAdminOwner,
    encodedFunctionCall,
  ]);

  const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");

  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress)

  return { proxyAdmin, proxy };
});

export default HyperpaymentV1Module;
