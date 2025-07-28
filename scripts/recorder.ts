import hre from "hardhat";
import path from "path";
import { cwd } from "process";
import fs from "fs";
import { SMILEY } from "./emoji";

export type DeployedContracts = {
    // chain id as a string
    [key: string]: {
        // Smartcontract name
        [key: string] : {
            abi: any[],
            address: string,
        }
    }
}

function getDeployedContractsUrl(): string {
    const url = path.join(cwd(), "./lib/deployed_contracts.json");
    return url;
}

async function getChainId(): Promise<string> {
    const network = await hre.ethers.provider.getNetwork()
    return network.chainId.toString();
}

function getDeployedContracts(): DeployedContracts {
    const url = getDeployedContractsUrl();
    try {
        const data = fs.statSync(url);
        if (!data.isFile()) {
            throw `Path ${url} exists, but not a file`;
        }
        const deployedContracts = JSON.parse(fs.readFileSync(url, {encoding: "utf-8"})) as DeployedContracts;
        return deployedContracts;
    } catch (err: any) {
        if (err.code === 'ENOENT') {
            console.log(`The deployed contracts at ${url} doesnt exist, return empty object`);
            return {} as DeployedContracts;
        }
        console.error(err);
        process.exit(1);
    }
}

function setDeployedContracts(data: DeployedContracts): void {
    const url = getDeployedContractsUrl();
    const raw = JSON.stringify(data, undefined, 4);
    fs.writeFileSync(url, raw)
}

export async function getDeployedContractAddress(smartcontractName: string): Promise<string> {
    const chainId = await getChainId();
    const deployedContracts = getDeployedContracts();
    if (!(chainId in deployedContracts)) {
        throw `No '${chainId}' chain id in the deployed contracts, please deploy ${smartcontractName} in ${chainId} network`
    }
    if (!(smartcontractName in deployedContracts[chainId])) {
        throw `No '${smartcontractName}' found in the deployed contracts, please deploy it first`;
    }

    return deployedContracts[chainId][smartcontractName].address;
}

export async function setDeployedContract(smartcontractName: string, address: string) {
    const chainId = await getChainId();
    const deployedContracts = getDeployedContracts();
    if (!(chainId in deployedContracts)) {
        deployedContracts[chainId] = {};
    }
    
    const artifact = hre.artifacts.readArtifactSync(smartcontractName);
    
    deployedContracts[chainId][smartcontractName] = {
        abi: artifact.abi,
        address: address   
    }

    setDeployedContracts(deployedContracts);
    console.log(`${SMILEY} Contract was added to ${getDeployedContractsUrl()}`);
}

export async function updateAbi(smartcontractName: string) {
    const chainId = await getChainId();
    const deployedContracts = getDeployedContracts();
    if (!(chainId in deployedContracts)) {
        throw `No ${chainId}, please call setDeployedContract first`
    }
    if (!(smartcontractName in deployedContracts[chainId])) {
        throw `No ${smartcontractName} in the Deployed Contracts, please call setDeployedContract first`;
    }

    const artifact = hre.artifacts.readArtifactSync(smartcontractName);
    
    deployedContracts[chainId][smartcontractName].abi = artifact.abi;

    setDeployedContracts(deployedContracts);
    console.log(`${SMILEY} Contract ABI was updated in ${getDeployedContractsUrl()}`);
}

