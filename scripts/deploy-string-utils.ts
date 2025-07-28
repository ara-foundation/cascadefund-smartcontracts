import hre from "hardhat";
import { SMILEY } from "./emoji";
import { setDeployedContract } from "./recorder";

async function main() {
    const Contract = await hre.ethers.getContractFactory("StringUtils");
    const contract = await Contract.deploy();
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    console.log(`${SMILEY} Contract was deployed at ${address}`);
    console.log(`Copy and run: npx hardhat verify --network ${hre.network.name} ${address}`);
    console.log(`Upgrade the smartcontract address on readme, and put ${address}`);

    await setDeployedContract("StringUtils", address);
}

main().catch(err => {
    console.log(err);
    process.exitCode = 1;
})