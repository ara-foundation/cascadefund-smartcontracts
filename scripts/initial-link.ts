/**
 * Creating an opensource hyperpayment specification on the hyperpayment v1
 * smartcontract
 */
import hre from "hardhat";
import { getDeployedAddress } from "./deployed-address";

const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";
const cascadeAccountName = "CascadeAccountModule#TransparentUpgradeableProxy";
const categorySbomName = "CategorySbomModule#TransparentUpgradeableProxy";
const categoryBusinessName = "CategoryBusinessModule#TransparentUpgradeableProxy";
const hodleTokenName = "TestTokenModule#TestToken";
const hyperpaymentRole = "0x4cca7bcb4ecab6a9629237484c704f867fbaf97cc795bfce8490a48f6e5db634";

async function main() {
    const accs = await hre.ethers.getSigners();
    console.log(`Grant CategorySBOM to interact with the CascadeAccount by ${accs[0].address}`);

    const cascadeAccountAddress = await getDeployedAddress(cascadeAccountName);
    const categorySbomAddress = await getDeployedAddress(categorySbomName);
    const categoryBusinessAddress = await getDeployedAddress(categoryBusinessName);
    const hodleTokenAddress = await getDeployedAddress(hodleTokenName);

    const cascadeAccount = await hre.ethers.getContractAt("CascadeAccount", cascadeAccountAddress);
    const hasRole = await cascadeAccount.hasRole(hyperpaymentRole, categorySbomAddress);
    if (!hasRole) {
        console.log(`CascadeAccount: category sbom has no access to cascade account, fixing...`);
        const response = await cascadeAccount.grantRole(hyperpaymentRole, categorySbomAddress);
        await response.wait();
        console.log(`CascadeAccount: ${response.hash} confirmed`);
    } else {
        console.log(`CascadeAccount: category sbom has access to it.`);
    }

    const categoryBusiness = await hre.ethers.getContractAt("CategoryBusiness", categoryBusinessAddress);
    const hodleAddress = await categoryBusiness.hodleToken();
    if (hodleAddress === EMPTY_ADDRESS) {
        console.log(`CategoryBusiness: no hodle token was set, fixing`);
        const response = await categoryBusiness.setHodleToken(hodleTokenAddress);
        await response.wait();
        console.log(`CategoryBusiness: ${response.hash} confirmed`);
    } else {
        console.log(`CategoryBusiness: holde address was set.`);
    }
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
})