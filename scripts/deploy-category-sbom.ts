import hre from "hardhat";
import { SMILEY } from "./emoji";
import { getDeployedContractAddress, setDeployedContract } from "./recorder";


async function main() {
    const cascadeAccountAddress = await getDeployedContractAddress("CascadeAccount");
    // Base Sepolia
    const Contract = await hre.ethers.getContractFactory("CategorySBOM");
    const contract = await hre.upgrades.deployProxy(Contract, [cascadeAccountAddress]);
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    console.log(`${SMILEY}Contract was deployed at ${address}`);
    console.log(`Copy and run: npx hardhat verify --network ${hre.network.name} ${address}`);
    console.log(`Upgrade the smartcontract address on readme, and put ${address}`);

    await setDeployedContract("CategorySBOM", address);
}

main().catch(err => {
    console.log(err);
    process.exitCode = 1;
})