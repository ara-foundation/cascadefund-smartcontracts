import hre from "hardhat";
import { SMILEY } from "./emoji";
import { getDeployedContractAddress, updateAbi } from "./recorder";


async function main() {
    // Base Sepolia
    const stringUtils = await getDeployedContractAddress("StringUtils");
    const address = await getDeployedContractAddress("CascadeAccount");
    const Contract = await hre.ethers.getContractFactory("CascadeAccount2", {
        libraries: {
            "StringUtils": stringUtils
        }
    });
    await hre.upgrades.upgradeProxy(address, Contract, {
        unsafeAllowLinkedLibraries: true
    });
    console.log(`${SMILEY} Contract was upgraded ${address}`);
    console.log(`Copy and run: npx hardhat verify --network ${hre.network.name} ${address}`);

    await updateAbi("CascadeAccount");
}

main().catch(err => {
    console.log(err);
    process.exitCode = 1;
})