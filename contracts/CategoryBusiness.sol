// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { Category } from "./Category.sol";
import { ResourceConverter } from "./ResourceConverter.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "hardhat/console.sol";

contract CategoryBusiness is Category {
    struct Project {
        address token;
        uint amount;
        address withdrawer;
        string username;
        string authProvider;
    }

    ResourceConverter public resourceConverter;
    IERC20 public hodleToken;

    mapping(uint => mapping(uint => Project)) public projects;

    event Paycheck(uint specID, uint projectID, uint splineID, uint splineCounter, uint amount, address token);

    constructor() {
    }

    function setHodleToken(address _tokenAddr) external {
        hodleToken = IERC20(_tokenAddr);
    }

    function setResourceConverter(address _addr) external {
        resourceConverter = ResourceConverter(_addr);
    }

    /**
     * Update the withdraw address of the project.
     * @param specID Hyperpayment specification
     * @param projectID project
     * @param _addr withdraw address
     */
    function setWithdrawer(uint specID, uint projectID, address _addr) external {
        projects[specID][projectID].withdrawer = _addr;
    }

    function withdraw(uint specID, uint projectID, uint _amount) public {
        require(_amount > 0, "Amount can not be 0");
        require(projects[specID][projectID].withdrawer == msg.sender, "Caller is not a withdrawer");
        require(projects[specID][projectID].amount >= _amount, "Not enough tokens");
        IERC20(projects[specID][projectID].token).transfer(msg.sender, _amount);
        projects[specID][projectID].amount -= _amount;
    }

    function withdrawAll(uint specID, uint projectID) external {
        require(projects[specID][projectID].amount > 0, "No tokens to withdraw");
        withdraw(specID, projectID, projects[specID][projectID].amount);
    }

    function getResourceBalance(uint specID, uint projectID) public view returns(uint) {
        if (projects[specID][projectID].token == address(0)) {
            return 0;
        } 
        uint balance = IERC20(projects[specID][projectID].token).balanceOf(address(this));
        return balance;
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
    function registerUser(uint specID, uint projectID, bytes calldata payload) external returns(bool) {
        (string memory username, string memory authProvider, address withdrawer) = decodePayload(payload);
        require(bytes(username).length > 0, "No Username provided");
        require(bytes(authProvider).length > 0, "No Auth provider");
        
        projects[specID][projectID].withdrawer = withdrawer;
        projects[specID][projectID].username = username;
        projects[specID][projectID].authProvider = authProvider;

        return true;
    }

    function encodePayload(string memory id, string memory authProvider, address withdrawer) public pure returns(bytes memory) {
        bytes memory payload = abi.encode(id, authProvider, withdrawer);
        return payload;
    }

    function decodePayload(bytes memory payload) public pure returns(string memory, string memory, address) {
        (
            string memory id,
            string memory authProvider,
            address withdrawer
        ) = abi.decode(payload, (string, string, address));

        return (id, authProvider, withdrawer);
    }
}