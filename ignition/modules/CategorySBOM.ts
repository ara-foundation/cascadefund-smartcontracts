import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import CascadeAccountModule from "./CascadeAccount";

const CategorySBOMModule = buildModule("CategorySbomModule", (m) => {
  const proxyAdminOwner = m.getAccount(0);
  const cascadeAccount = m.useModule(CascadeAccountModule);

  const contract = m.contract("CategorySBOM");

  const encodedFunctionCall = m.encodeFunctionCall(contract, "initialize", [
    cascadeAccount.proxy
  ]);

  const proxy = m.contract("TransparentUpgradeableProxy", [
    contract,
    proxyAdminOwner,
    encodedFunctionCall,
  ]);

  const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");

  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress)

  return { proxyAdmin, proxy };
});

export default CategorySBOMModule;
