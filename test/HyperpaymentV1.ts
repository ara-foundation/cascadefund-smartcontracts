import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import path from "path";
import { cwd } from "process";
import { parseEther } from "viem";
import fs from "fs";

const multiplier = parseEther("1");

const SCORE_TOKEN = "0x0000000000000000000000000000000000000001";
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

type ResourceName = string;
type CategoryName = string;
type SplineID = number;

    type Flow = {
      from: ResourceName;
      to: ResourceName;
      percentage: number;
    }

  type Spline = {
    beforeJunction: SplineID;
    afterJunction: SplineID;
    flow: Flow;
    category: CategoryName;
  }

type HyperpaymentSpecification = {
  url: string;
  splines: {
    [splineID: number]: Spline;
  };
  categories: {
    [categoryName: string]: string; // Address of the category contract
  };
  resources: {
    [resourceName: string]: string;
  }
}

type User = {
  category: CategoryName;
  payload: string;
}

let openSourceSpecification: HyperpaymentSpecification = {
  url: "hyperpayment.org/specification/opensource-hyperpayment-specification",
  categories: {
    customer: "0x0000000000000000000000000000000000000000",
    business: "0x0000000000000000000000000000000000000000",
    dep: "0x0000000000000000000000000000000000000000",
    environment: "0x0000000000000000000000000000000000000000",
  },
  resources: {
    customer: SCORE_TOKEN,
    environment: SCORE_TOKEN,
    business: SCORE_TOKEN,
    dep: SCORE_TOKEN
  },
  splines: {
    // Initial Resource retreiver is indexed as 0.
    0: {
      beforeJunction: 0,
      afterJunction: 0,
      flow: {
        from: "customer",
        to: "customer",
        percentage: 100 * 10_000
      },
      category: "customer"
    },
    1: {
      beforeJunction: 3,
      afterJunction: 0,
      flow: {
        from: "customer",
        to: "business",
        percentage: 80 * 10_000 // 80%
      },
      category: "business"
    },
    2: {
      beforeJunction: 0,
      afterJunction: 0,
      flow: {
        from: "customer",
        to: "environment",
        percentage: 0.1 * 10_000
      },
      category: "environment"
    },
    3: {
      beforeJunction: 0,
      afterJunction: 2,
      flow: {
        from: "customer",
        to: "dep",
        percentage: 19.9 * 10_000
      },
      category: "dep"
    }
  }  
}

let deployToken: boolean = false;

function populateResources(spec: HyperpaymentSpecification, addr: string): HyperpaymentSpecification {
  for (const name of Object.keys(spec.categories)) {
    spec.resources[name] = addr;
  }
  return spec;
}

describe("HyperpaymentV1", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployContract() {
    const [owner, otherAccount] = await hre.ethers.getSigners();

    const stringUtils = await hre.ethers.deployContract("StringUtils", [], {});

    const customerCategory = await hre.ethers.deployContract("CategorySample", ["customer"], {});
    const bizCategory = await hre.ethers.deployContract("CategorySample", ["business"], {});
    const depCategory = await hre.ethers.deployContract("CategorySample", ["dep"], {});
    const environmentCategory = await hre.ethers.deployContract("CategorySample", ["environment"], {});
    
    const Contract = await hre.ethers.getContractFactory("HyperpaymentV1", {libraries: {
      StringUtils: await stringUtils.getAddress(),
    }});
    const contract = await Contract.deploy();

    openSourceSpecification.categories["customer"] = await customerCategory.getAddress();
    openSourceSpecification.categories["business"] = await bizCategory.getAddress();
    openSourceSpecification.categories["dep"] = await depCategory.getAddress();
    openSourceSpecification.categories["environment"] = await environmentCategory.getAddress();
    
    if (!deployToken) {
      openSourceSpecification = populateResources(openSourceSpecification, SCORE_TOKEN);
    } else {
      const testToken = await hre.ethers.deployContract("TestToken", [openSourceSpecification.categories["customer"], "Gold", "GLD"]);
      const testTokenAddress = await testToken.getAddress();
      openSourceSpecification = populateResources(openSourceSpecification, testTokenAddress);
      
      await customerCategory.setResourceToken(testTokenAddress);
      await bizCategory.setResourceToken(testTokenAddress);
      await environmentCategory.setResourceToken(testTokenAddress);
      await depCategory.setResourceToken(testTokenAddress);

      return {
        contract,
        categories: {
          customer: customerCategory,
          business: bizCategory,
          dep: depCategory,
          environment: environmentCategory,
        },
        owner,
        otherAccount,
        testToken
      }
    }

    return {
      contract,
      customerCategory,
      owner,
      otherAccount,
    };
  }

  async function deployVariousContracts() {
    const [owner, otherAccount] = await hre.ethers.getSigners();

    const stringUtils = await hre.ethers.deployContract("StringUtils", [], {});
    // CategorySBOM requires
    const cascadeAccount = await hre.ethers.deployContract("CascadeAccount", [], {
      libraries: {
        StringUtils: await stringUtils.getAddress(),
      }
    })
    const cascadeAccountAddress = await cascadeAccount.getAddress();

    const customerCategory = await hre.ethers.deployContract("CategoryCustomer", [owner.address], {});
    const bizCategory = await hre.ethers.deployContract("CategoryBusiness", [], {});
    const depCategory = await hre.ethers.deployContract("CategorySBOM", [cascadeAccountAddress], {});
    const environmentCategory = await hre.ethers.deployContract("CategorySBOM", [cascadeAccountAddress], {});
    
    const Contract = await hre.ethers.getContractFactory("HyperpaymentV1", {libraries: {
      StringUtils: await stringUtils.getAddress(),
    }});
    const contract = await Contract.deploy();

    openSourceSpecification.categories["customer"] = await customerCategory.getAddress();
    openSourceSpecification.categories["business"] = await bizCategory.getAddress();
    openSourceSpecification.categories["dep"] = await depCategory.getAddress();
    openSourceSpecification.categories["environment"] = await environmentCategory.getAddress();
    
    const testToken = await hre.ethers.deployContract("TestToken", [owner.address, "Gold", "GLD"]);
    const testTokenAddress = await testToken.getAddress();
    openSourceSpecification = populateResources(openSourceSpecification, testTokenAddress);
  
    // Business category requires hodler
    await bizCategory.setHodleToken(testTokenAddress);

    return {
        contract,
        categories: {
          customer: customerCategory,
          business: bizCategory,
          dep: depCategory,
          environment: environmentCategory,
        },
        owner,
        otherAccount,
        testToken,
        testTokenAddress
    }
  }

  async function createSpecification(contract: any) {
    const url = openSourceSpecification.url;
    const categoryNames = Object.keys(openSourceSpecification.categories);
    const categoryAddresses = Object.values(openSourceSpecification.categories);
    const resourceNames = Object.keys(openSourceSpecification.resources);
    const resources = Object.values(openSourceSpecification.resources);
    const splines = Object.values(openSourceSpecification.splines); 

    await expect(contract.createSpecification(url, categoryAddresses, categoryNames, resourceNames, resources, splines.length)).to.be.fulfilled;

    const specID = 1;
    const beforeJunctions = splines.map((spline: Spline) => spline.beforeJunction);
    const afterJunctions = splines.map((spline: Spline) => spline.afterJunction);
    const splineCategories = splines.map((spline: Spline) => spline.category);
    await expect(contract.addSplines(specID, beforeJunctions, afterJunctions, splineCategories)).to.be.fulfilled;

    const flowFrom = splines.map((spline: Spline) => spline.flow.from);
    const flowTo = splines.map((spline: Spline) => spline.flow.to);
    const flowPercentages = splines.map((spline: Spline) => spline.flow.percentage);
    await expect(contract.addFlows(specID, flowFrom, flowTo, flowPercentages)).to.be.fulfilled;
  }

  async function createProject(contract: any) {
    const users: User[] = [
          { category: "business", payload: "0x11" },
          { category: "dep", payload: "0x11" },
          { category: "dep", payload: "0x11" },
          { category: "environment", payload: "0x11" }
    ];
    const userCategories = users.map(user => user.category);
    const userPayloads = users.map(user => user.payload);
    const specID = 1;
    await expect(contract.createProject(specID, userCategories, userPayloads)).to.be.fulfilled;
  }

  function getBusinessPayload(): string {
    const purl = "pkg:git@github.com/ahmetson/project.git"
    const username = "ahmetson";
    const authProvider = "github.com";
    const withdraw = EMPTY_ADDRESS;
    const encodedPayload = hre.ethers.AbiCoder.defaultAbiCoder().encode(["string","string","string","address"], [purl, username, authProvider, withdraw]);

    return encodedPayload;
  }

  function getEnvPayload(): string {
    const envs = ["env:charity"];
    const encodedPayload = hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint","string[]"], [envs.length, envs]);
    return encodedPayload;
  }

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

  function getDepPayload(): string {
    const purls = getPurls();
    const encodedPayload = hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint","string[]"], [purls.length, purls]);
    return encodedPayload;
  }

  async function createVariousCategoryProject(contract: any) {
    const users: User[] = [
      { category: "business", payload: getBusinessPayload() },
      { category: "environment", payload: getEnvPayload() },
      { category: "dep", payload: getDepPayload() }
    ];

    const userCategories = users.map(user => user.category);
    const userPayloads = users.map(user => user.payload);
    const specID = 1;
    await expect(contract.createProject(specID, userCategories, userPayloads)).to.be.fulfilled;
  }

  describe("Hyperpayment Specification", function () {
      it("It should create the open-source specification", async function () {
        const { contract } = await loadFixture(deployContract);

        expect(await contract.specCounter()).to.equal(0n);

        await createSpecification(contract);
        
        expect(await contract.specCounter()).to.equal(1n);
      });

      it("Should create a project", async function () {
        const { contract } = await loadFixture(
          deployContract
        );

        await createSpecification(contract);
        expect(await contract.specCounter()).to.equal(1n);

        expect(await contract.projectCounter(1)).to.equal(0n);
        await createProject(contract);
        expect(await contract.projectCounter(1)).to.equal(1n);
      });
  });

  describe("Hyperpayment flows", function() {
    it("Should process payment using virtual goodies", async function () {
      deployToken = false;
      const { contract } = await loadFixture(deployContract);
      deployToken = false;
      await createSpecification(contract);
      await createProject(contract);

      const specID = 1;
      const projectID = 1;
      const payload = "0x11";

      expect(await contract.getProductAmount()).to.equal(0n);

      await expect(contract.hyperpay(specID, projectID, payload)).to.be.fulfilled;
      expect(await contract.getProductAmount()).to.equal(0n);
    });

    it("Should process payment using tokens", async function() {
      deployToken = true;
      const { contract, categories } = await deployContract();
      await createSpecification(contract);
      await createProject(contract);
      deployToken = false;

      const specID = 1;
      const projectID = 1;
      const payload = "0x11";

      // Check the contract parameters
      // const beforeCustomerCategory = await categories!.customer.getInfo();
      // const beforeBizCategory = await categories!.business.getInfo();
      // const beforeDepCategory = await categories!.dep.getInfo();
      // const beforeEnvironmentCategory = await categories!.environment.getInfo();
      // console.log(`Before hyperpay, the 'customer' category: ${beforeCustomerCategory![0]}, balance: ${beforeCustomerCategory![1]}`)
      // console.log(`Before hyperpay, the 'biz' category: ${beforeBizCategory![0]}, balance: ${beforeBizCategory![1]}`)
      // console.log(`Before hyperpay, the 'dep' category: ${beforeDepCategory![0]}, balance: ${beforeDepCategory![1]}`)
      // console.log(`Before hyperpay, the 'environment' category: ${beforeEnvironmentCategory![0]}, balance: ${beforeEnvironmentCategory![1]}`)
    
      expect(await contract.getProductAmount()).to.equal(0n);
      await expect(contract.hyperpay(specID, projectID, payload)).to.be.fulfilled;
      expect(await contract.getProductAmount()).to.equal(0n);

      // const afterCustomerCategory = await categories!.customer.getInfo();
      // const afterBizCategory = await categories!.business.getInfo();
      // const afterDepCategory = await categories!.dep.getInfo();
      // const afterEnvironmentCategory = await categories!.environment.getInfo();
      // console.log(`After hyperpay, the 'customer' category: ${afterCustomerCategory![0]}, balance: ${afterCustomerCategory![1]}`)
      // console.log(`After hyperpay, the 'biz' category: ${afterBizCategory![0]}, balance: ${afterBizCategory![1]}`)
      // console.log(`After hyperpay, the 'dep' category: ${afterDepCategory![0]}, balance: ${afterDepCategory![1]}`)
      // console.log(`After hyperpay, the 'environment' category: ${afterEnvironmentCategory![0]}, balance: ${afterEnvironmentCategory![1]}`)

    })
  })

  describe("Various categories", function() {
    it("Deploy customer/business/dep", async function() {
      const { contract, categories, testTokenAddress, testToken } = await deployVariousContracts();
      await createSpecification(contract);
      await createVariousCategoryProject(contract);

      //
      // Imitate the user's deposit
      //
      const counter = 1;
      const amount = parseEther("50");
      const resourceToken = testTokenAddress;
      const resourceName = "customer";
      const encodedPayload = hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint","uint","address","string"], [counter, amount, resourceToken, resourceName]);

      const specID = 1;
      const projectID = 1;

      const calculatedAddress = await categories.customer.getCalculatedAddress(specID, projectID, encodedPayload);
      await expect(testToken.transfer(calculatedAddress, amount)).to.be.fulfilled;

      //
      // Hyperpay
      //
      console.log(`The customer category address: ${await categories.customer.getAddress()}`);
      await expect(contract.hyperpay(specID, projectID, encodedPayload)).to.be.fulfilled;
    })
  })
});
