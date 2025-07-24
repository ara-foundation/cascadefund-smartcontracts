import { getDeployedAddress } from "./deployed-address";

type ResourceName = string;
type CategoryName = string;
type SplineID = number;

    type Flow = {
      from: ResourceName;
      to: ResourceName;
      percentage: number;
    }

  export type Spline = {
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

const categoryBusinessName = "CategoryBusinessModule#TransparentUpgradeableProxy";
const categorySbomName = "CategorySbomModule#TransparentUpgradeableProxy";
const categoryCustomerName = "CategoryCustomerModule#TransparentUpgradeableProxy"

export async function getOpenSourceSpecification(resourceAddress: string): Promise<HyperpaymentSpecification> {
    const categoryBusinessAddress = await getDeployedAddress(categoryBusinessName);
    const categorySbomAddress = await getDeployedAddress(categorySbomName);
    const categoryCustomerAddress = await getDeployedAddress(categoryCustomerName);

    let openSourceSpecification: HyperpaymentSpecification = {
        url: "hyperpayment.org/specification/opensource-hyperpayment-specification",
        categories: {
            customer: categoryCustomerAddress,
            business: categoryBusinessAddress,
            dep: categorySbomAddress,
            environment: categorySbomAddress,
        },
        resources: {
            customer: resourceAddress,
            environment: resourceAddress,
            business: resourceAddress,
            dep: resourceAddress
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

    return openSourceSpecification;
}
