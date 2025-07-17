// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ResourceFlowModule = buildModule("ResourceFlowModule", (m) => {
  const lock = m.contract("ResourceFlow", [], {
  });

  return { lock };
});

export default ResourceFlowModule;
