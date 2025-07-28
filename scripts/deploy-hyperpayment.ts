import hre from "hardhat";
import { SMILEY } from "./emoji";
import { getDeployedContractAddress, setDeployedContract } from "./recorder";


async function main() {
    const stringUtils = await getDeployedContractAddress("StringUtils");

    const Contract = await hre.ethers.getContractFactory("HyperpaymentV1", {
        libraries: {
            "StringUtils": stringUtils
        }
    });
    const contract = await hre.upgrades.deployProxy(Contract, [], {
        unsafeAllowLinkedLibraries: true
    });
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    console.log(`${SMILEY} Contract was deployed at ${address}`);
    console.log(`Copy and run: npx hardhat verify --network ${hre.network.name} ${address}`);
    console.log(`Upgrade the smartcontract address on readme, and put ${address}`);
    console.log(`Call linking smartcontracts: npx hardhar run scripts/initial-link.ts --network ${hre.network.name}`);
    await setDeployedContract("HyperpaymentV1", address);
}

main().catch(err => {
    console.log(err);
    process.exitCode = 1;
})