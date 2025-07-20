// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface Category {
    /**
     * Return the initial product to the calling smartcontract.
     * Transfers the tokens if the token is a crypto token.
     * @param specID hyperpayment specification
     * @param projectID project that implements the specification
     * @param payload additional info about the transaction
     * @return resourceName 
     * @return resourceAmount 
     */
    function getInitialProduct(uint specID, uint projectID, bytes calldata payload) 
        external returns (string memory resourceName, uint resourceAmount);
    function paycheck(uint specID, uint projectID, uint splineID, uint splineCounter, address token, uint amount) external;
    function registerUser(uint specID, uint projectID, bytes calldata payload) external returns(bool);
}