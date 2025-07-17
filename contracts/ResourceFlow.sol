// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./StringUtils.sol";

contract ResourceFlow {
    struct Product {
        uint resourceAmount;
        uint leftPercentage;    // How much of the resource is left to be processed
        uint perPercentage;
    }

    mapping(string => Product) private products;
    string[] private productNames;

    constructor() {
        // Initialize the contract if needed
    }

    function storeInitialProduct(string memory resourceName, uint resourceAmount) public {
        uint leftPercentage = 100;
        uint perPercentage = resourceAmount * 10 ** 18 / leftPercentage;
        storeProduct(resourceName, resourceAmount, leftPercentage, perPercentage);
    }

    function storeProduct(string memory resourceName, uint resourceAmount, uint leftPercentage, uint perPercentage) public {
        require(products[resourceName].leftPercentage == 0, "Product already exists");
        products[resourceName] = Product(resourceAmount, leftPercentage, perPercentage);
        productNames.push(resourceName);
    }

    function getProduct(string memory resourceName) public view returns (uint, uint, uint) {
        Product memory product = products[resourceName];
        require(product.leftPercentage > 0, "Product not found");
        return (product.resourceAmount, product.leftPercentage, product.perPercentage);
    }

    function getProductAmount() public view returns (uint) {
        return productNames.length;
    }

    function takeProduct(string memory resourceName) public returns(uint, uint, uint) {
        require(products[resourceName].leftPercentage > 0, "Product not found or already taken");
        Product memory product = products[resourceName];
        delete products[resourceName];
        
        bool found = false;
        for (uint i = 0; i < productNames.length; i++) {
            if (StringUtils.equal(productNames[i], resourceName)) {
                found = true;
            }

            if (found && i < productNames.length - 1) {
                productNames[i] = productNames[i+1];
            }

        }
        productNames.pop();
        return (product.resourceAmount, product.leftPercentage, product.perPercentage);
    }
}
