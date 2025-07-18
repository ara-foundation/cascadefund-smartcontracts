// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// import "hardhat/console.sol";
import { Category } from "./Category.sol";
import { ResourceConverter } from "./ResourceConverter.sol";
import { ResourceFlow } from "./ResourceFlow.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { StringUtils } from "./StringUtils.sol";

contract HyperpaymentV1 is ResourceFlow {
    address constant public SCORE_TOKEN = address(0x01);
    address constant public NATIVE_TOKEN = address(0x02);

    struct Flow {
        string from;
        string to;
        // The 'to' resource is equivalent 
        // to the percentage of the 'from' resource.
        uint percentage;
    }

    struct Spline {
        uint beforeJunction;
        uint afterJunction;
        Flow flow;
        string category;
    }

    struct HyperpaymentSpecification {
        string url;
        uint projectCounter;
        uint splineCounter;
        mapping(uint => Spline) splines;
        mapping(string => address) categories;
        mapping(string => address) resources;
    }

    ResourceConverter public diffResourceConverter;
    uint public specCounter;
    mapping(uint => HyperpaymentSpecification) public specs;

    event CreateSpecification(uint specID, string url, uint categoryCounter, uint resourceCounter, uint splineCounter);
    event CreateProject(uint specID, uint projectID);

    constructor() {}

    function setDiffResourceConverter(address addr) external {
        diffResourceConverter = ResourceConverter(addr);
    }

    // Create a new hyperpayment speficication.
    function createSpecification(
        string calldata _url,
        address[] calldata _categoriesAddresses,
        string[] calldata _categoryNames,
        string[] calldata _resourceNames,
        address[] calldata _resources,
        uint _splinesAmount
    ) external {
        specCounter++;

        specs[specCounter].url = _url;
        specs[specCounter].splineCounter = _splinesAmount;
        
        // Define the resources for the hyperpayment specification.
        for (uint j = 0; j < _resources.length; j++) {
            specs[specCounter].resources[_resourceNames[j]] = _resources[j];
        }
        
        // Define the categories for the hyperpayment specification.
        for (uint i = 0; i < _categoryNames.length; i++) {
            specs[specCounter].categories[_categoryNames[i]] = _categoriesAddresses[i];
        }

        emit CreateSpecification(specCounter, _url, _categoryNames.length, _resources.length, _splinesAmount);
    }

    function addSplines(
        uint specID,
        uint[] calldata beforeJunction,
        uint[] calldata afterJunction,
        string[] calldata category
    ) external {
        uint splineAmount = specs[specID].splineCounter;
        // Define the splines for the hyperpayment specification.
        for (uint k = 0; k < splineAmount; k++) {
            specs[specID].splines[k].beforeJunction = beforeJunction[k];
            specs[specID].splines[k].afterJunction = afterJunction[k];
            specs[specID].splines[k].category = category[k];
        }
    }

    function addFlows(
        uint specID,
        string[] calldata flowFrom,
        string[] calldata flowTo,
        uint[] calldata flowPercentage
    ) external {
        uint splineAmount = specs[specID].splineCounter;
        // Define the splines for the hyperpayment specification.
        for (uint k = 0; k < splineAmount; k++) {
            specs[specID].splines[k].flow = Flow({
                from: flowFrom[k],
                to: flowTo[k],
                percentage: flowPercentage[k]
            });
        }
    }

    function projectCounter(uint specID) external view returns (uint) {
        return specs[specID].projectCounter;
    }

    // Create a new project for the hyperpayment specification.
    function createProject(uint specID, string[] calldata userCategories, bytes[] calldata userPayloads) external {
        uint projectID = specs[specID].projectCounter + 1;

        for (uint i = 0; i < userCategories.length; i++) {
            address categoryAddress = specs[specID].categories[userCategories[i]];
            require(categoryAddress != address(0), "Category is invalid");

            Category categoryContract = Category(categoryAddress);
            require(categoryContract.registerUser(specID, projectID, userPayloads[i]), "Failed to register user in category contract");
        }

        specs[specID].projectCounter = projectID;
        emit CreateProject(specID, projectID);
    }

    function hyperpay(uint specID, uint projectID, bytes calldata payload) external {
        Category categoryContract = getCategoryContract(specID, 0);

        // The Customer contract should transfer the funds
        // to this smartcontract.
        (string memory resourceName, uint resourceAmount) = categoryContract.getInitialProduct(specID, projectID, payload);
        storeInitialProduct(resourceName, resourceAmount);

        processSpline(specID, projectID, 1, 1);
    }

    function processSpline(uint specID, uint projectID, uint splineID, uint counter) internal {
        Spline storage spline = specs[specID].splines[splineID];

        // Split the product according to the resource flow.
        splitProducts(specID, spline.flow);

        // If there is a before junction, then recursively process it.
        if (spline.beforeJunction > 0) {
            processSpline(specID, projectID, spline.beforeJunction, counter++);
        }

        (uint resourceAmount,,) = takeProduct(spline.flow.to);
        Category categoryContract = getCategoryContract(specID, splineID);
        transferToCategory(
            address(categoryContract),
            resourceAmount,
            specs[specID].resources[spline.flow.to]
        );

        categoryContract.paycheck(specID, projectID, splineID, counter, specs[specID].resources[spline.flow.to], resourceAmount);

        // If there is an after junction, then resursively process it.
        if (spline.afterJunction > 0) {
            processSpline(specID, projectID, spline.afterJunction, counter++);
        }
    }

    // If resource type of from and to is not the same, then
    //      transfer the funds to the resource adapter.
    function splitProducts(uint specID, Flow memory flow) internal {
        (uint resourceAmount, uint leftPercentage, uint perPercentage) = takeProduct(flow.from);
        require(leftPercentage >= flow.percentage, "Not enough resource left to convert");
        uint toResourceAmount = (flow.percentage * perPercentage / 10_000);
        resourceAmount -= toResourceAmount / 10 ** 18;
        leftPercentage -= flow.percentage;
        if (leftPercentage > 0) {
            storeProduct(flow.from, resourceAmount, leftPercentage, perPercentage);
        }

        address fromResource = specs[specID].resources[flow.from];
        address toResource = specs[specID].resources[flow.to];
        if (fromResource != toResource) {
            require(address(diffResourceConverter) != address(0), "Please, set converter");
            toResourceAmount = diffResourceConverter.convert(toResourceAmount / 10 * 18, fromResource, toResource);
        }

        storeProduct(flow.to, toResourceAmount / 10 ** 18, 100 * 10_000, toResourceAmount / 100);
    }

    /**
     * The resources will be transferred to the category contract.
     */
    function transferToCategory(address categoryContract, uint resourceAmount, address token) internal {
        require(token != NATIVE_TOKEN, "Native tokens not supported yet");
        if (token != SCORE_TOKEN) {
            IERC20(token).transfer(categoryContract, resourceAmount);
        }
    }

    function getCategory(uint specID, uint splineID) public view returns(string memory) {
        string memory category = specs[specID].splines[splineID].category;
        return category;
    }

    function getCategoryContract(uint specID, uint splineID) public view returns (Category) {
        string memory category = getCategory(specID, splineID);
        address categoryAddress = specs[specID].categories[category];
        require(categoryAddress != address(0), "Category contract address is not set");
        return Category(categoryAddress);
    }
}