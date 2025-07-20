import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { parseEther } from "viem";
import fs from "fs";
import { cwd } from "process";
import path from "path";

const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";

type PackageJSON = {
  name: string;
  devDependencies?: {
    [key: string]: string
  },
  dependencies?: {
    [key: string]: string
  },
}

describe("CategorySBOM", function () {
  function getPurls(): string[] {
    const url = path.join(cwd(), './package.json');
    const packageJSON = JSON.parse(fs.readFileSync(url, { encoding: 'utf-8' })) as PackageJSON;
    let deps: string[] = [];
    if (packageJSON.dependencies) {
      deps = Object.keys(packageJSON.dependencies).map(dep => `pkg:npm/${dep}@latest`);
    }
    if (packageJSON.devDependencies) {
      const devDeps = Object.keys(packageJSON.devDependencies).map(dep => `pkg:npm/${dep}@latest`);
      deps = deps.concat(...devDeps);
    }
    return deps;
  }

  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployContract() {
    const [owner, otherAccount] = await hre.ethers.getSigners();

    const stringUtils = await hre.ethers.deployContract("StringUtils", [], {});
    const cascadeAccount = await hre.ethers.deployContract("CascadeAccount", [], {
      libraries: {
        StringUtils: await stringUtils.getAddress(),
      }
    })

    const Contract = await hre.ethers.getContractFactory("CategorySBOM", {});
    const contract = await Contract.deploy(await cascadeAccount.getAddress());

    const testToken = await hre.ethers.deployContract("TestToken", [owner, "Gold", "GLD"]);
    const testTokenAddress = await testToken.getAddress();

    return {
      contract,
      owner,
      otherAccount,
      testToken,
      testTokenAddress,
      cascadeAccount
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
        
        const purls = getPurls();
        const encodedPayload = hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint","string[]"], [purls.length, purls]);

        const calculatedPayload = await contract.encodePayload(purls.length, purls);
        expect(calculatedPayload).to.be.equal(encodedPayload);
        expect(await contract.decodePayload(calculatedPayload)).to.deep.equal([purls.length, purls]);
      });
  });

  describe("Management and setup", function() {
    it("Register a user", async function() {
      const { contract } = await loadFixture(
        deployContract
      );

      const specID = 1;
      const projectID = 1;
      const packageID = 1;
      const purls = getPurls();

      const prePackageAmount = await contract.packageAmount(specID, projectID);
      expect(prePackageAmount).to.be.equal(0);
      const prePurl = await contract.packages(specID, projectID, packageID);
      expect(prePurl).to.be.equal("");

      const encodedPayload = hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint", "string[]"], [purls.length, purls]);
      await expect(contract.registerUser(specID, projectID, encodedPayload)).to.be.fulfilled;

      const postPackageAmount = await contract.packageAmount(specID, projectID);
      expect(postPackageAmount).to.be.equal(purls.length);
      const postPurl = await contract.packages(specID, projectID, packageID);
      expect(postPurl).to.be.equal(purls[0]);
    })
  })

  describe("Paycheck", function() {
    it("Should add the paychecks", async function() {
      const { contract, testToken, testTokenAddress, cascadeAccount } = await loadFixture(
        deployContract
      );

      const specID = 1;
      const projectID = 1;
      const purls = getPurls();
      const encodedPayload = hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint", "string[]"], [purls.length, purls]);
      await expect(contract.registerUser(specID, projectID, encodedPayload)).to.be.fulfilled;

      const packageID = 1;
      /**
       * Before paycheck:
       */
      const balance1 = await cascadeAccount.balanceOf(purls[0], testTokenAddress);
      expect(balance1).to.be.equal(0n);

      const paycheckAmount = parseEther("50");
      await expect(testToken.transfer(await contract.getAddress(), paycheckAmount)).to.be.fulfilled;
      const splineID = 1;
      const splineCounter = 2;
      await expect(contract.paycheck(specID, projectID, splineID, splineCounter, testTokenAddress, paycheckAmount)).to.be.fulfilled;

      const balance2 = await cascadeAccount.balanceOf(purls[0], testTokenAddress)
      expect(balance2).to.be.equal(paycheckAmount / BigInt(purls.length));
    })
  })
});
