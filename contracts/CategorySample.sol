// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { Category } from "./Category.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "hardhat/console.sol";

contract CategorySample is Category {
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

    function getInitialProduct(
        uint, 
        uint, 
        bytes calldata
    ) external returns (string memory resourceName, uint resourceAmount) {
        if (address(resourceToken) == address(0)) {
            return ("customer", 100 * 10 ** 18);
        }
        require(resourceToken.transfer(msg.sender, 100 * 10 ** 18));
        return ("customer", 100 * 10 ** 18);
    }
    
    function paycheck(uint, uint, uint, uint, address, uint) external pure {
    }
    
    function registerUser(uint, uint, bytes calldata) external pure returns(bool) {
        return true;
    }
}