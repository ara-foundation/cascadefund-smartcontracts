import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { parseEther } from "viem";

const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("CategoryBusiness", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployContract() {
    const [owner, otherAccount] = await hre.ethers.getSigners();

    const Contract = await hre.ethers.getContractFactory("CategoryBusiness");
    const contract = await Contract.deploy();

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
      it("Should revert with the right error if trying to get initial product", async function () {
        const { contract } = await loadFixture(deployContract);

        await expect(contract.getInitialProduct(1n, 1n, "0x11")).to.be.rejectedWith(
          "Not implemented"
        );
      });

      it("Encoding/decoding payload works", async function () {
        const { contract } = await loadFixture(
          deployContract
        );

        const purl = "pkg:git@github.com/ahmetson/project.git"
        const username = "ahmetson";
        const authProvider = "github.com";
        const withdraw = EMPTY_ADDRESS;

        const encodedPayload = hre.ethers.AbiCoder.defaultAbiCoder().encode(["string","string","string","address"], [purl, username, authProvider, withdraw]);

        const calculatedPayload = await contract.encodePayload(purl, username, authProvider, withdraw);
        expect(calculatedPayload).to.be.equal(encodedPayload);
        // console.log(`The payload username: '${username}', auth provider: '${authProvider}', withdraw account: '${withdraw}'`)
        // console.log(`Calculated as: '${calculatedPayload}'`);
        // console.log(`Encoded as: '${encodedPayload}'`);
        expect(await contract.decodePayload(calculatedPayload)).to.deep.equal([purl, username, authProvider, withdraw]);
      });
  });

  describe("Management and setup", function() {
    it("Register a user", async function() {
      const { contract } = await loadFixture(
        deployContract
      );

      const specID = 1;
      const projectID = 1;
      const purl = "pkg:git@github.com/ahmetson/project.git"
      const username = "ahmetson";
      const authProvider = "github.com";
      const withdraw = EMPTY_ADDRESS;

      const preProject = await contract.projects(specID, projectID);
      expect(preProject.username).to.be.equal("");
      expect(preProject.authProvider).to.be.equal("");
      expect(preProject.withdrawer).to.be.equal(EMPTY_ADDRESS);

      const encodedPayload = hre.ethers.AbiCoder.defaultAbiCoder().encode(["string", "string","string","address"], [purl, username, authProvider, withdraw]);
      await expect(contract.registerUser(specID, projectID, encodedPayload)).to.be.fulfilled;

      const postProject = await contract.projects(specID, projectID);
      expect(postProject.username).to.be.equal(username);
      expect(postProject.authProvider).to.be.equal(authProvider);
      expect(postProject.withdrawer).to.be.equal(EMPTY_ADDRESS);
    })
  })

  describe("Paycheck", function() {
    it("Should add the paychecks", async function() {
      const { contract, testToken, testTokenAddress } = await loadFixture(
        deployContract
      );
      await expect(contract.setHodleToken(testTokenAddress)).to.be.fulfilled;

      const specID = 1;
      const projectID = 1;
      const purl = "pkg:git@github.com/ahmetson/project.git"
      const username = "ahmetson";
      const authProvider = "github.com";
      const withdraw = EMPTY_ADDRESS;
      const encodedPayload = hre.ethers.AbiCoder.defaultAbiCoder().encode(["string", "string","string","address"], [purl, username, authProvider, withdraw]);
      await expect(contract.registerUser(specID, projectID, encodedPayload)).to.be.fulfilled;

      /**
       * Before paycheck:
       */
      const projectInfo1 = await contract.projects(specID, projectID)
      expect(projectInfo1.amount).to.be.equal(0n);
      expect(projectInfo1.withdrawer).to.be.equal(EMPTY_ADDRESS);

      const paycheckAmount = parseEther("50");
      await expect(testToken.transfer(await contract.getAddress(), paycheckAmount)).to.be.fulfilled;
      const splineID = 1;
      const splineCounter = 2;
      await expect(contract.paycheck(specID, projectID, splineID, splineCounter, testTokenAddress, paycheckAmount)).to.be.fulfilled;

      const projectInfo2 = await contract.projects(specID, projectID)
      expect(projectInfo2.amount).to.be.equal(paycheckAmount);
      expect(projectInfo2.token).to.be.equal(testTokenAddress);

      // The second paycheck
      await expect(testToken.transfer(await contract.getAddress(), paycheckAmount)).to.be.fulfilled;
      await expect(contract.paycheck(specID, projectID, splineID, splineCounter, testTokenAddress, paycheckAmount)).to.be.fulfilled;

      const projectInfo3 = await contract.projects(specID, projectID)
      expect(projectInfo3.amount).to.be.equal(paycheckAmount + paycheckAmount);
    })

    it("Should withdraw", async function() {
      const { contract, testToken, testTokenAddress, otherAccount, owner } = await loadFixture(
        deployContract
      );
      await expect(contract.setHodleToken(testTokenAddress)).to.be.fulfilled;

      const specID = 1;
      const projectID = 1;
      const purl = "pkg:git@github.com/ahmetson/project.git"
      const username = "ahmetson";
      const authProvider = "github.com";
      const withdraw = EMPTY_ADDRESS;
      const encodedPayload = hre.ethers.AbiCoder.defaultAbiCoder().encode(["string", "string","string","address"], [purl, username, authProvider, withdraw]);
      await expect(contract.registerUser(specID, projectID, encodedPayload)).to.be.fulfilled;

      /**
       * Before paycheck:
       */
      const paycheckAmount = parseEther("50");
      await expect(testToken.transfer(await contract.getAddress(), paycheckAmount)).to.be.fulfilled;
      const splineID = 1;
      const splineCounter = 2;
      await expect(contract.paycheck(specID, projectID, splineID, splineCounter, testTokenAddress, paycheckAmount)).to.be.fulfilled;

      /**
       * WITHDRAW some portion
       */
      const withdrawAmount = parseEther("23.3");
      await expect(contract.connect(otherAccount).withdraw(specID, projectID, withdrawAmount)).to.be.rejectedWith("Caller is not a withdrawer");
      await expect(contract.withdraw(specID, projectID, withdrawAmount)).to.be.rejectedWith("Caller is not a withdrawer");
      await expect(contract.setWithdrawer(specID, projectID, owner.address)).to.be.fulfilled;
      const exceedingAmount = paycheckAmount * 2n;
      await expect(contract.withdraw(specID, projectID, exceedingAmount)).to.be.rejectedWith("Not enough tokens");

      await expect(contract.withdraw(specID, projectID, withdrawAmount)).to.be.fulfilled;

      const projectInfo3 = await contract.projects(specID, projectID)
      expect(projectInfo3.amount).to.be.equal(paycheckAmount - withdrawAmount);
      expect(projectInfo3.withdrawer).to.be.equal(owner.address);

      /**
       * Paycheck again
       */
      await expect(testToken.transfer(await contract.getAddress(), paycheckAmount)).to.be.fulfilled;
      await expect(contract.paycheck(specID, projectID, splineID, splineCounter, testTokenAddress, paycheckAmount)).to.be.fulfilled;
      const projectInfo4 = await contract.projects(specID, projectID)
      expect(projectInfo4.amount).to.be.equal(paycheckAmount - withdrawAmount + paycheckAmount);
      
      /**
       * Withdraw all
       */
      await expect(contract.withdrawAll(specID, projectID)).to.be.fulfilled;
      const projectInfo5 = await contract.projects(specID, projectID)
      expect(projectInfo5.amount).to.be.equal(0n);
    })
  })
});
