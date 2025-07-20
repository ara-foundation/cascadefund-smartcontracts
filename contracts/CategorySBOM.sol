// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { Category } from "./Category.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { CascadeAccount } from "./CascadeAccount.sol";
import { AccessControlUpgradeable } from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
// import "hardhat/console.sol";

/**
 * @title CategorySBOM
 * @author Medet Ahmetson
 * @dev This smart contract manages categories for Software Bill of Materials (SBOM) within a blockchain-based system.
 * It allows for the creation, modification, and retrieval of SBOM for open source projects,enabling structured organization and
 * classification of software components and their dependencies. The contract is designed to facilitate transparency,
 * traceability, and compliance in software supply chains by providing a decentralized and immutable record of SBOM categories.
 */
contract CategorySBOM is Category, AccessControlUpgradeable {
    CascadeAccount public cascadeAccount;

    mapping(uint => mapping(uint => uint)) public packageAmount;
    /**
     * @notice package's purl as spec id => project id => package id
     */
    mapping(uint => mapping(uint => mapping(uint => string))) public packages;

    bytes32 public constant HYPERPAYMENT_ROLE = keccak256("HYPERPAYMENT_ROLE");

    event Paycheck(uint specID, uint projectID, uint packageAmount, uint splineID, uint splineCounter, uint amount, address token);

    function initialize(address _cascadeAddr) initializer public {
        cascadeAccount = CascadeAccount(_cascadeAddr);
 	    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
 	    _grantRole(HYPERPAYMENT_ROLE, msg.sender);
    }

    /**********************************************************************
     * 
     * Other hyperpayment smartcontracts
     * 
     ***********************************************************************/

    function getInitialProduct(uint, uint, bytes calldata) external pure returns (string memory, uint) {
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
    function paycheck(uint specID, uint projectID, uint splineID, uint splineCounter, address token, uint amount) external onlyRole(HYPERPAYMENT_ROLE) {
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
    function registerUser(uint specID, uint projectID, bytes calldata payload) external onlyRole(HYPERPAYMENT_ROLE) returns(bool) {
        (uint amount, string[] memory purls) = decodePayload(payload);
        require(amount > 0, "No packages given");
        for (uint i = 1; i <= amount; i++) {
            require(bytes(purls[i-1]).length > 0, "No Auth provider");
            packages[specID][projectID][i] = purls[i-1];
        }
        packageAmount[specID][projectID] = amount;

        return true;
    }

    /**********************************************************************
     * 
     * View
     * 
     ***********************************************************************/

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