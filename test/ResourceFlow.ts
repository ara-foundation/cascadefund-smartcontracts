import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { parseEther } from "viem";

const multiplier = parseEther("1");

describe("ResourceFlow", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployContract() {
    const [owner, otherAccount] = await hre.ethers.getSigners();

    const stringUtils = await hre.ethers.deployContract("StringUtils", [], {});

    const Contract = await hre.ethers.getContractFactory("ResourceFlow", {libraries: {
      StringUtils: await stringUtils.getAddress(),
    }});
    const contract = await Contract.deploy();

    return {
      contract,
      owner,
      otherAccount
    };
  }

  describe("Products", function () {
      it("Should revert with the right error if taking product that doesnt exist", async function () {
        const { contract } = await loadFixture(deployContract);

        await expect(contract.takeProduct("customer")).to.be.rejectedWith(
          "Product not found or already taken"
        );
      });

      it("Should store initial product", async function () {
        const { contract } = await loadFixture(
          deployContract
        );

        // Transactions are sent using the first signer by default
        const resourceAmount = parseEther("123");

        expect(await contract.getProductAmount()).to.equal(0n);

        await expect(contract.storeInitialProduct("customer", resourceAmount)).to.be.fulfilled;
        expect(await contract.getProductAmount()).to.equal(1n);

        expect(await contract.getProduct("customer")).to.deep.equal([resourceAmount, 100n, resourceAmount * multiplier/100n]);
      });

      it("Taking the first product, then splitting and taking it again should work", async function () {
        const { contract } = await loadFixture(
          deployContract
        );

        // Transactions are sent using the first signer by default
        const customerResourceName = "customer";
        let customerResourceAmount = parseEther("123");

        expect(await contract.getProductAmount()).to.equal(0n);

        await expect(contract.storeInitialProduct(customerResourceName, customerResourceAmount)).to.be.fulfilled;
        expect(await contract.getProductAmount()).to.equal(1n);

        // We assume that we took the product
        const customerProduct = await contract.getProduct(customerResourceName);
        await expect(contract.takeProduct(customerResourceName)).to.be.fulfilled;
        expect(await contract.getProductAmount()).to.equal(0n);

        // Add the second product
        const businessResourceName = "biz";
        const businessResourceAmount = customerProduct[2] * 50n / multiplier;
        const businessLeftPercentage = 100n;
        const businessPerPercentage = businessResourceAmount * multiplier / 100n;
        customerResourceAmount = customerProduct[0] - businessResourceAmount;
        const customerLeftPercentage = customerProduct[1] - 50n;

        // Now splitted resources storage
        await expect(contract.storeProduct(customerResourceName, customerResourceAmount, customerLeftPercentage, customerProduct[2])).to.be.fulfilled;
        await expect(contract.storeProduct(businessResourceName, businessResourceAmount, businessLeftPercentage, businessPerPercentage)).to.be.fulfilled;
        expect(await contract.getProductAmount()).to.equal(2n);
        
        expect(await contract.getProduct(customerResourceName)).to.deep.equal([customerResourceAmount, customerLeftPercentage, customerProduct[2]]);
        expect(await contract.getProduct(businessResourceName)).to.deep.equal([businessResourceAmount, businessLeftPercentage, businessPerPercentage]);

        // Take the customer, as we assume its given to the 'environment' category of the users.
        await expect(contract.takeProduct(customerResourceName)).to.be.fulfilled;
        expect(await contract.getProductAmount()).to.equal(1n);
        expect(await contract.getProduct(businessResourceName)).to.deep.equal([businessResourceAmount, businessLeftPercentage, businessPerPercentage]);
      });
    });
});
