/**
 * Creating an opensource hyperpayment specification on the hyperpayment v1
 * smartcontract
 */
import hre from "hardhat";
import { getDeployedAddress } from "./deployed-address";
import { getOpenSourceSpecification, Spline } from "./hyperpayment.types";

const hyperpaymentV1Name = "HyperpaymentV1Module#TransparentUpgradeableProxy";
const categoryBusinessName = "CategoryBusinessModule#TransparentUpgradeableProxy";
const categorySbomName = "CategorySbomModule#TransparentUpgradeableProxy";
const categoryCustomerName = "CategoryCustomerModule#TransparentUpgradeableProxy"
const hyperpaymentRole = "0xfc24bd2866d4f21a3c7a09cde981207397f26e9f9fadb9875868f03c1c5228ee";
const tokenName = "TestTokenModule#TestToken";

async function main() {
    const accs = await hre.ethers.getSigners();
    console.log(`Create Open-Source specification by ${accs[0].address}`);

    const hyperpaymentV1Address = await getDeployedAddress(hyperpaymentV1Name);
    console.log(`HyperpaymentV1 address: ${hyperpaymentV1Address}`);

    const categorySbomAddress = await getDeployedAddress(categorySbomName);
    console.log(`CategorySBOM: ${categorySbomAddress} address`);
    const categorySbom = await hre.ethers.getContractAt("CategorySBOM", categorySbomAddress);
    
    let hasRole = await categorySbom.hasRole(hyperpaymentRole, hyperpaymentV1Address);
    if (!hasRole) {
        console.warn(`CategorySBOM: The hyperpayment v1 isn't granted access, fixing...`);
        const response = await categorySbom.grantRole(hyperpaymentRole, hyperpaymentV1Address);
        console.log(`Tx: ${response.hash} confirmed`);
    } else {
        console.log(`CategorySBOM: The hyperpayment v1 granted access, skipping`);
    }


    const categoryBusinessAddress = await getDeployedAddress(categoryBusinessName);
    console.log(`CategoryBusiness: ${categoryBusinessAddress} address`);
    const categoryBusiness = await hre.ethers.getContractAt("CategoryBusiness", categoryBusinessAddress);
    
    hasRole = await categoryBusiness.hasRole(hyperpaymentRole, hyperpaymentV1Address);
    if (!hasRole) {
        console.warn(`CategoryBusiness: The hyperpayment v1 isn't granted access, fixing...`);
        const response = await categoryBusiness.grantRole(hyperpaymentRole, hyperpaymentV1Address);
        console.log(`Tx: ${response.hash} confirmed`);
    } else {
        console.log(`CategoryBusiness: The hyperpayment v1 granted access, skipping`);
    }


    const categoryCustomerAddress = await getDeployedAddress(categoryCustomerName);
    console.log(`CategoryCustomer: ${categoryCustomerAddress} address`);
    const categoryCustomer = await hre.ethers.getContractAt("CategoryCustomer", categoryCustomerAddress);
    
    hasRole = await categoryCustomer.hasRole(hyperpaymentRole, hyperpaymentV1Address);
    if (!hasRole) {
        console.warn(`CategoryCustomer: The hyperpayment v1 isn't granted access, fixing...`);
        const response = await categoryCustomer.grantRole(hyperpaymentRole, hyperpaymentV1Address);
        console.log(`Tx: ${response.hash} confirmed`);
    } else {
        console.log(`CategoryCustomer: The hyperpayment v1 granted access, skipping`);
    }

    console.log(`Everything is linked, create the open source specification...`);
    await createSpecification(hyperpaymentV1Address);
}

async function createSpecification(hyperpaymentV1Address: string) {
    const tokenAddress = await getDeployedAddress(tokenName);
    console.log(`Token address: ${tokenAddress}`);

    const hyperpaymentV1 = await hre.ethers.getContractAt("HyperpaymentV1", hyperpaymentV1Address);

    const openSourceSpecification = await getOpenSourceSpecification(tokenAddress);

    const url = openSourceSpecification.url;
    const categoryNames = Object.keys(openSourceSpecification.categories);
    const categoryAddresses = Object.values(openSourceSpecification.categories);
    const resourceNames = Object.keys(openSourceSpecification.resources);
    const resources = Object.values(openSourceSpecification.resources);
    const splines = Object.values(openSourceSpecification.splines); 

    const specID = parseInt((await hyperpaymentV1.specCounter()).toString()) + 1;

    console.log(`Hyperpayment: Creating a specification with id: ${specID}`);
    const response1 = await hyperpaymentV1.createSpecification(url, categoryAddresses, categoryNames, resourceNames, resources, splines.length);
    await response1.wait();
    console.log(`Hyperpayment: tx ${response1.hash} confirmed, add splines...`);

    const beforeJunctions = splines.map((spline: Spline) => spline.beforeJunction);
    const afterJunctions = splines.map((spline: Spline) => spline.afterJunction);
    const splineCategories = splines.map((spline: Spline) => spline.category);
    const response2 = await hyperpaymentV1.addSplines(specID, beforeJunctions, afterJunctions, splineCategories);
    await response2.wait();
    console.log(`Hyperpayment: tx ${response2.hash} confirmed, add flows...`);

    const flowFrom = splines.map((spline: Spline) => spline.flow.from);
    const flowTo = splines.map((spline: Spline) => spline.flow.to);
    const flowPercentages = splines.map((spline: Spline) => spline.flow.percentage);
    const response3 = await hyperpaymentV1.addFlows(specID, flowFrom, flowTo, flowPercentages);
    console.log(`Hyperpayment: tx ${response3.hash} confirmed.`);

    console.log(`Hyperpayment: open source was added, spec id: ${specID}`);
} 

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
})