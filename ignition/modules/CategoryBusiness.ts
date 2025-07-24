import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CategoryBusinessModule = buildModule("CategoryBusinessModule", (m) => {
  const proxyAdminOwner = m.getAccount(0);
  const contract = m.contract("CategoryBusiness");

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

export default CategoryBusinessModule;
