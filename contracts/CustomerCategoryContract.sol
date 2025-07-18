// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { ICategoryContract } from "./ICategoryContract.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

contract CustomerCategoryContract is ICategoryContract {
    IERC20 public resourceToken;
    string public category;

    constructor(string memory _category) {
        category = _category;
    }

    function setResourceToken(address _tokenAddr) external {
        resourceToken = IERC20(_tokenAddr);
    }

    function getInfo() public view returns(string memory, uint) {
        if (address(resourceToken) == address(0)) {
            return (category, 0);
        } 
        uint balance = resourceToken.balanceOf(address(this));
        return (category, balance);
    }

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
        console.log("Get initial product for resource token: ", address(resourceToken));
        if (address(resourceToken) == address(0)) {
            return ("customer", 100 * 10 ** 18);
        }
        (string memory cat, uint balance) = getInfo();
        console.log("My category: ", cat, " my balance: ", balance);
        require(resourceToken.transfer(msg.sender, 100 * 10 ** 18));
        return ("customer", 100 * 10 ** 18);
    }
    
    function paycheck(uint specID, uint projectID, uint splineID, uint splineCounter, address token, uint amount) external {

    }
    
    function registerUser(uint specID, uint projectID, bytes calldata payload) external returns(bool) {
        return true;
    }
}