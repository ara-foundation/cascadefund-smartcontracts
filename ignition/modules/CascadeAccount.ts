import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CascadeAccountModule = buildModule("CascadeAccountModule", (m) => {
  const proxyAdminOwner = m.getAccount(0);
  const stringUtils = m.library("StringUtils");

  const contract = m.contract("CascadeAccount", [], {
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

export default CascadeAccountModule;
