import hre from "hardhat";
import { SMILEY } from "./emoji";
import { setDeployedContract } from "./recorder";

async function main() {
    const minter = (await hre.ethers.getSigners())[0];
    const name = "FakeUSDC";
    const symbol = "fUSDC";

    const Contract = await hre.ethers.getContractFactory("TestToken");
    const contract = await Contract.deploy(minter.address, name, symbol);
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    console.log(`${SMILEY} Contract was deployed at ${address}`);
    console.log(`Copy and run: npx hardhat verify --network ${hre.network.name} ${address}`);
    console.log(`Upgrade the smartcontract address on readme, and put ${address}`);

    await setDeployedContract("Stablecoin", address);
}

main().catch(err => {
    console.log(err);
    process.exitCode = 1;
})