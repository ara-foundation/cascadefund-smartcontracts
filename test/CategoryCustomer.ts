import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { parseEther } from "viem";

const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("CategorySBOM", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployContract() {
    const [owner, otherAccount] = await hre.ethers.getSigners();

    const Contract = await hre.ethers.getContractFactory("CategoryCustomer", {});
    const contract = await Contract.deploy(owner.address);

    const testToken = await hre.ethers.deployContract("TestToken", [owner, "Gold", "GLD"]);
    const testTokenAddress = await testToken.getAddress();

    return {
      contract,
      owner,
      otherAccount,
      testToken,
      testTokenAddress,
    };
  }

  describe("Not business logic", function () {
      it("Should revert with the right error if trying to paycheck", async function () {
        const { contract, testTokenAddress } = await loadFixture(deployContract);

        await expect(contract.paycheck(1n, 1n, 1n, 1n, testTokenAddress, 1n)).to.be.rejectedWith(
          "Not implemented"
        );
      });

      it("Should revert with the right error if trying to register user", async function () {
        const { contract } = await loadFixture(deployContract);

        await expect(contract.registerUser(1n, 1n, "0x11")).to.be.rejectedWith(
          "Not implemented"
        );
      });

      it("Encoding/decoding payload works", async function () {
        const { contract, testTokenAddress } = await loadFixture(
          deployContract
        );
        
        const counter = 1;
        const amount = parseEther("50");
        const resourceToken = testTokenAddress;
        const resourceName = "customer";

        const encodedPayload = hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint","uint","address","string"], [counter, amount, resourceToken, resourceName]);
        expect(await contract.decodePayload(encodedPayload)).to.deep.equal([counter, amount, resourceToken, resourceName]);
      });
  });

  describe("Withdraw tokens", function() {
    it("Should deploy the contract and return the data", async function() {
      const { contract, testToken, testTokenAddress, otherAccount: hyperpaymentV1 } = await loadFixture(
        deployContract
      );

      const counter = 1;
      const amount = parseEther("50");
      const resourceToken = testTokenAddress;
      const resourceName = "customer";
      const encodedPayload = hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint","uint","address","string"], [counter, amount, resourceToken, resourceName]);

      const specID = 1;
      const projectID = 1;

      console.log(`CategoryCustomer.getBytecode() must be called only once in the server and used in CategoryCustomer.getSalt() all the time`)
      const calculatedAddress = await contract.getCalculatedAddress(specID, projectID, encodedPayload);

      //
      // Snapshot to compare the state related to the hyperpayment
      //

      // Before depositing
      const beforeAddr = await contract.withdrawnDeposits(calculatedAddress);
      expect(beforeAddr).to.be.equal(false);

      const beforeCounter = await contract.usedCounters(counter);
      expect(beforeCounter).to.be.equal(false);

      const beforeInitialBalance = await testToken.balanceOf(hyperpaymentV1.address);
      expect(beforeInitialBalance).to.be.equal(0n);

      //
      // hyperpayment flow
      //

      // Imitate the user's deposit
      console.log(`The address of deposit: ${calculatedAddress}, resource name: ${resourceName}`)
      await expect(testToken.transfer(calculatedAddress, amount)).to.be.fulfilled;
      // initial product called by hyperpayment function
      await expect(contract.connect(hyperpaymentV1).getInitialProduct(specID, projectID, encodedPayload)).to.be.fulfilled;
      console.log(`Server must put the countrer so it won't be repeated`);

      //
      // validate the hyperpayment result
      //
      const afterAddr = await contract.withdrawnDeposits(calculatedAddress);
      expect(afterAddr).to.be.equal(true);

      const afterCounter = await contract.usedCounters(counter);
      expect(afterCounter).to.be.equal(true);

      const afterInitialBalance = await testToken.balanceOf(hyperpaymentV1.address);
      expect(afterInitialBalance).to.be.equal(amount);
    })
  })

});
