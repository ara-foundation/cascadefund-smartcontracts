// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract Account {
    struct Product {
        uint resourceAmount;
        uint leftPercentage;    // How much of the resource is left to be processed
        uint perPercentage;
    }

    mapping(address => bool) public businessAccounts;
    mapping(address => bool) public cascadeAccounts;

    // Make the balances and list of the resource tokens and how much the user earned

    constructor() {
        // Initialize the contract if needed
    }

    function isBusinessAccount(address _account) public view returns(bool) {
        return businessAccounts[_account];
    }

    function isCascadeAccount(address _account) public view returns(bool) {
        return cascadeAccounts[_account];
    }
}
