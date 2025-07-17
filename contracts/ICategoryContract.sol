// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface ICategoryContract {
    function getInitialProduct(
        uint specID, 
        uint projectID, 
        bytes calldata payload) external returns (string memory resourceName, uint resourceAmount);
    function paycheck(uint specID, uint projectID, uint splineID, uint splineCounter, address token, uint amount) external;
}