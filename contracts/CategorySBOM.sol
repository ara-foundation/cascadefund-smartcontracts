// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { Category } from "./Category.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { CascadeAccount } from "./CascadeAccount.sol";
// import "hardhat/console.sol";

contract CategorySBOM is Category {
    CascadeAccount public cascadeAccount;

    mapping(uint => mapping(uint => uint)) public packageAmount;
    mapping(uint => mapping(uint => mapping(uint => string))) public packages;

    event Paycheck(uint specID, uint projectID, uint packageAmount, uint splineID, uint splineCounter, uint amount, address token);

    constructor(address _addr) {
        cascadeAccount = CascadeAccount(_addr);
    }

    function getInitialProduct(
        uint,
        uint, 
        bytes calldata
    ) external pure returns (string memory, uint) {
        revert("Not implemented");
    }

    /**
     * Pay to the user his share of the tokens. Before calling it, make sure that
     * hodle tokens were called.
     * @notice If a user doesn't have his withdraw account, and hodle token and project tokens
     * mismatch, then we keep the project tokens in the hodling tokens.
     * @param specID Hyperpayment specification
     * @param projectID project that implements hyperpayment
     * @param splineID spline of hyperpayment
     * @param splineCounter spline counter (spline jump to each other doesnt mean it goes by order, so we keep track of it)
     * @param amount amount of tokens that were transferred
     */    
    function paycheck(uint specID, uint projectID, uint splineID, uint splineCounter, address token, uint amount) external {
        uint filledPurl = 0;
        for (uint i = 1; i <= packageAmount[specID][projectID]; i++) {
            if (bytes(packages[specID][projectID][i]).length > 0) {
                filledPurl++;
            }
        }
        require(filledPurl > 0, "No packages");
        uint amountPerPackage = amount / filledPurl;
        for (uint i = 1; i <= packageAmount[specID][projectID]; i++) {
            if (bytes(packages[specID][projectID][i]).length == 0) {
                continue;
            }
            IERC20(token).transfer(address(cascadeAccount), amountPerPackage);
            cascadeAccount.cascadePaycheck(packages[specID][projectID][i], token, amountPerPackage, specID, projectID, splineID);
        }
        emit Paycheck(specID, projectID, packageAmount[specID][projectID], splineID, splineCounter,  amount, token);
    }

    /**
     * Register a user for the category.
     * Business only takes a one account per user.
     * 
     * For example, given that we use GitHub to authenticate:
     *  ```
     *  ID              = 'ahmetson'
     *  authProvider    = 'github'
     *  ```
     * @param specID hyperpayment specification
     * @param projectID project that implements the hyperpayment
     * @param payload user data encoded as ABI
     */   
    function registerUser(uint specID, uint projectID, bytes calldata payload) external returns(bool) {
        (uint amount, string[] memory purls) = decodePayload(payload);
        require(amount > 0, "No packages given");
        for (uint i = 1; i <= amount; i++) {
            require(bytes(purls[i-1]).length > 0, "No Auth provider");
            packages[specID][projectID][i] = purls[i-1];
        }
        packageAmount[specID][projectID] = amount;

        return true;
    }

    function encodePayload(uint amount, string[] memory purls) public pure returns(bytes memory) {
        bytes memory payload = abi.encode(amount, purls);
        return payload;
    }

    function decodePayload(bytes memory payload) public pure returns(uint, string[] memory) {
        (
            uint amount,
            string[] memory purls
        ) = abi.decode(payload, (uint, string[]));

        return (amount, purls);
    }
}