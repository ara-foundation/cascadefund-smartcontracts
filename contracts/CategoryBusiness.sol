// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { Category } from "./Category.sol";
import { ResourceConverter } from "./ResourceConverter.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { AccessControlUpgradeable } from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
// import "hardhat/console.sol";

/**
 * @title Business category
 * @author Medet Ahmetson
 * @notice Handles the reception of the tokens who wants to receive the donations
 */
contract CategoryBusiness is Category, AccessControlUpgradeable {
    struct Project {
        address token;
        uint amount;
        address withdrawer;
        string purl;
        string username;
        string authProvider;
    }

    ResourceConverter public resourceConverter;
    IERC20 public hodleToken;

    mapping(uint => mapping(uint => Project)) public projects;

    bytes32 public constant SERVER_ROLE = keccak256("SERVER_ROLE");
    bytes32 public constant WITHDRAWER_ROLE = keccak256("SERVER_ROLE");
    bytes32 public constant HYPERPAYMENT_ROLE = keccak256("HYPERPAYMENT_ROLE");

    event Paycheck(uint specID, uint projectID, uint splineID, uint splineCounter, uint amount, address token);

    modifier onlyWithdrawer(uint specID, uint projectID) {
        require(projects[specID][projectID].withdrawer == msg.sender || hasRole(WITHDRAWER_ROLE, msg.sender), "Not withdrawer");
        _;
    }

    function initialize() initializer public {
 	    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
 	    _grantRole(SERVER_ROLE, msg.sender);
 	    _grantRole(WITHDRAWER_ROLE, msg.sender);
 	    _grantRole(HYPERPAYMENT_ROLE, msg.sender);
    }

    /**********************************************************************
     * 
     * Control by the server
     * 
     ***********************************************************************/

    /**
     * If paycheck is received in a different token, we convert all into the hodling token
     * @param _tokenAddr hodling token
     */
    function setHodleToken(address _tokenAddr) external onlyRole(SERVER_ROLE) {
        hodleToken = IERC20(_tokenAddr);
    }

    /**
     * If we need to exchange the tokens, then we use the resource converter
     * @param _addr Resource converter address
     */
    function setResourceConverter(address _addr) external onlyRole(SERVER_ROLE) {
        resourceConverter = ResourceConverter(_addr);
    }

    /**
     * Update the withdraw address of the project.
     * @param specID Hyperpayment specification
     * @param projectID project
     * @param _addr withdraw address
     */
    function setWithdrawer(uint specID, uint projectID, address _addr) external onlyRole(SERVER_ROLE) {
        projects[specID][projectID].withdrawer = _addr;
    }

    /**********************************************************************
     * 
     * User related operations
     * - requires WITHDRAW_ROLE
     * 
     ***********************************************************************/

    /**
     * Withdraw certain amount of the tokens
     * @param specID hyperpayment spec
     * @param projectID project that implements the hyperpayment
     * @param amount amount of tokens to withdraw
     */
    function withdraw(uint specID, uint projectID, uint amount) external onlyWithdrawer(specID, projectID) {
        _withdraw(specID, projectID, amount);
    }

    /**
     * Withdraw all the tokens
     * @param specID hyperpayment specification
     * @param projectID project that implements the hyperpayment
     */
    function withdrawAll(uint specID, uint projectID) external onlyWithdrawer(specID, projectID) {
        require(projects[specID][projectID].amount > 0, "No tokens to withdraw");
        _withdraw(specID, projectID, projects[specID][projectID].amount);
    }

    function _withdraw(uint specID, uint projectID, uint amount) internal {
        require(amount > 0, "Amount can not be 0");
        require(projects[specID][projectID].withdrawer == msg.sender, "Caller is not a withdrawer");
        require(projects[specID][projectID].amount >= amount, "Not enough tokens");
        IERC20(projects[specID][projectID].token).transfer(msg.sender, amount);
        projects[specID][projectID].amount -= amount;
    }

    /**********************************************************************
     * 
     * View
     * 
     ***********************************************************************/

    /**
     * Encode the parameters of the business user to register.
     * @param purl ID of the package in the web
     * @param username user who is the maintainer
     * @param authProvider user is authentication in this platform
     * @param withdrawer optionally a wallet address to withdraw the tokens
     */
    function encodePayload(string memory purl, string memory username, string memory authProvider, address withdrawer) public pure returns(bytes memory) {
        bytes memory payload = abi.encode(purl, username, authProvider, withdrawer);
        return payload;
    }

    /**
     * Decode the bytes into a purl, username, authentication provider and optionally to a withdrawer.
     * It's the opposite of the 'encodePayload' function.
     * @param payload encoded bytecode
     * @return purl
     * @return username
     * @return authProvider
     * @return withdraw
     */
    function decodePayload(bytes memory payload) public pure returns(string memory, string memory, string memory, address) {
        (
            string memory purl,
            string memory username,
            string memory authProvider,
            address withdrawer
        ) = abi.decode(payload, (string, string, string, address));

        return (purl, username, authProvider, withdrawer);
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
        if (projects[specID][projectID].withdrawer == address(0)) {
            // convert and hodle the tokens
            require(address(hodleToken) != address(0), "No hodle token");
            if (address(hodleToken) != token) {
                require(address(resourceConverter) != address(0), "No resource converter");
                IERC20(token).transfer(address(resourceConverter), amount);
                uint hodleAmount = resourceConverter.convert(amount, token, address(hodleToken));
                projects[specID][projectID].amount += hodleAmount;
                projects[specID][projectID].token = address(hodleToken);
                emit Paycheck(specID, projectID, splineID, splineCounter, hodleAmount, address(hodleToken));
            } else {
                projects[specID][projectID].amount += amount;
                projects[specID][projectID].token = address(hodleToken);
                emit Paycheck(specID, projectID, splineID, splineCounter, amount, address(hodleToken));
            }

        } else {
            if (projects[specID][projectID].amount > 0) {
                if (projects[specID][projectID].token != token) {
                    require(address(resourceConverter) != address(0), "No resource converter");
                    IERC20(projects[specID][projectID].token).transfer(address(resourceConverter), amount);
                    uint tokenAmount = resourceConverter.convert(projects[specID][projectID].amount, projects[specID][projectID].token, token) + amount;
            
                    projects[specID][projectID].amount = tokenAmount;
                    projects[specID][projectID].token = token;
                    emit Paycheck(specID, projectID, splineID, splineCounter, amount, token);
                    return;
                }
            }
            projects[specID][projectID].amount += amount;
            projects[specID][projectID].token = token;
            emit Paycheck(specID, projectID, splineID, splineCounter, amount, token);
        }
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
        (string memory purl, string memory username, string memory authProvider, address withdrawer) = decodePayload(payload);
        require(bytes(username).length > 0, "No Username provided");
        require(bytes(authProvider).length > 0, "No Auth provider");
        
        projects[specID][projectID].withdrawer = withdrawer;
        projects[specID][projectID].purl = purl;
        projects[specID][projectID].username = username;
        projects[specID][projectID].authProvider = authProvider;

        return true;
    }

    
}