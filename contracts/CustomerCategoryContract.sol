// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { ICategoryContract } from "./ICategoryContract.sol";

contract CustomerCategoryContract is ICategoryContract {
    constructor() {}

    /**
     * Returns the resources deposited by the users.
     * @param _specID hyperpayment specification
     * @param _projectID project that users belong too.
     * @param _payload additional information
     * @return resourceName 
     * @return resourceAmount 
     */
    function getInitialProduct(
        uint _specID, 
        uint _projectID, 
        bytes calldata _payload
    ) external returns (string memory resourceName, uint resourceAmount) {
        return ("customer", 100 * 10 ** 18);
    }
    
    function paycheck(uint specID, uint projectID, uint splineID, uint splineCounter, address token, uint amount) external {

    }
    
    function registerUser(uint specID, uint projectID, bytes calldata payload) external returns(bool) {
        return true;
    }
}