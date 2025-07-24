import hre from "hardhat";
import fs from "fs";
import { cwd } from "process";
import path from "path";

type DeployedAddresses = {
    [key: string]: string
}

function getDeployedAddresses(chainID: number|bigint): DeployedAddresses {
    const url = path.join(cwd(), `./ignition/deployments/chain-${chainID}/deployed_addresses.json`);
    const json = JSON.parse(fs.readFileSync(url, { encoding: 'utf-8' })) as DeployedAddresses;
    return json;
}

export async function getDeployedAddress(ignitionModuleName: string) {
    const network = await hre.ethers.provider.getNetwork();
    const deployedAddresses = getDeployedAddresses(network.chainId);
    return deployedAddresses[ignitionModuleName];
}
