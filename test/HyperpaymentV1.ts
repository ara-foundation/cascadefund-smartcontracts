import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { parseEther } from "viem";

const multiplier = parseEther("1");

const SCORE_TOKEN = "0x0000000000000000000000000000000000000001";

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

    const customerCategory = await hre.ethers.deployContract("CategoryCustomer", ["customer"], {});
    const bizCategory = await hre.ethers.deployContract("CategoryCustomer", ["business"], {});
    const depCategory = await hre.ethers.deployContract("CategoryCustomer", ["dep"], {});
    const environmentCategory = await hre.ethers.deployContract("CategoryCustomer", ["environment"], {});
    
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
});
