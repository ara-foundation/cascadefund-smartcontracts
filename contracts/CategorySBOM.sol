// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { Category } from "./Category.sol";
import { ResourceConverter } from "./ResourceConverter.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { StringUtils } from "./StringUtils.sol";
// import "hardhat/console.sol";

contract CategorySBOM is Category {
    struct Package {
        address token;
        uint amount;
        address withdrawer;
        string purl;
        string username;
        string authProvider;
    }

    ResourceConverter public resourceConverter;
    IERC20 public hodleToken;

    mapping(uint => mapping(uint => uint)) public packageAmount;
    mapping(uint => mapping(uint => mapping(uint => Package))) public packages;

    event Paycheck(uint specID, uint projectID, uint packageAmount, uint splineID, uint splineCounter, uint amount, address token);
    event PaycheckPackage(uint specID, uint projectID, uint packageID, uint amount, address token);

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
    function setMaintainer(uint specID, uint projectID, uint packageID, address _addr, string calldata _username, string calldata _authProvider) external {
        require(packageID > 0 && packageID <= packageAmount[specID][projectID], "Invalid package ID");
        if (packages[specID][projectID][packageID].withdrawer != _addr) {
            packages[specID][projectID][packageID].withdrawer = _addr;
        }
        if (!StringUtils.equal(packages[specID][projectID][packageID].username, _username)) {
            packages[specID][projectID][packageID].username = _username;
            packages[specID][projectID][packageID].authProvider = _authProvider;
        }
    }

    function withdraw(uint specID, uint projectID, uint packageID, uint _amount) public {
        require(packageID > 0 && packageID <= packageAmount[specID][projectID], "Invalid package ID");
        require(_amount > 0, "Amount can not be 0");
        require(packages[specID][projectID][packageID].withdrawer == msg.sender, "Caller is not a withdrawer");
        require(packages[specID][projectID][packageID].amount >= _amount, "Not enough tokens");
        IERC20(packages[specID][projectID][packageID].token).transfer(msg.sender, _amount);
        packages[specID][projectID][packageID].amount -= _amount;
    }

    function withdrawAll(uint specID, uint projectID, uint packageID) external {
        require(packages[specID][projectID][packageID].amount > 0, "No tokens to withdraw");
        withdraw(specID, projectID, packageID, packages[specID][projectID][packageID].amount);
    }

    function getResourceBalance(uint specID, uint projectID, uint packageID) public view returns(uint) {
        if (packages[specID][projectID][packageID].token == address(0)) {
            return 0;
        } 
        uint balance = IERC20(packages[specID][projectID][packageID].token).balanceOf(address(this));
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
        for (uint i = 1; i <= packageAmount[specID][projectID]; i++) {
            if (bytes(packages[specID][projectID][i].purl).length == 0) {
                continue;
            }
            paycheckPackage(specID, projectID, i, token, amount);
        }
        emit Paycheck(specID, projectID, packageAmount[specID][projectID], splineID, splineCounter,  amount, token);
    }

    function paycheckPackage(uint specID, uint projectID, uint packageID, address token, uint amount) internal {
        if (packages[specID][projectID][packageID].withdrawer == address(0)) {
            // convert and hodle the tokens
            require(address(hodleToken) != address(0), "No hodle token");
            if (address(hodleToken) != token) {
                require(address(resourceConverter) != address(0), "No resource converter");
                IERC20(token).transfer(address(resourceConverter), amount);
                uint hodleAmount = resourceConverter.convert(amount, token, address(hodleToken));
                packages[specID][projectID][packageID].amount += hodleAmount;
                packages[specID][projectID][packageID].token = address(hodleToken);
                emit PaycheckPackage(specID, projectID, packageID, hodleAmount, address(hodleToken));
            } else {
                packages[specID][projectID][packageID].amount += amount;
                packages[specID][projectID][packageID].token = address(hodleToken);
                emit PaycheckPackage(specID, projectID, packageID, amount, address(hodleToken));
            }

        } else {
            if (packages[specID][projectID][packageID].amount > 0) {
                if (packages[specID][projectID][packageID].token != token) {
                    require(address(resourceConverter) != address(0), "No resource converter");
                    IERC20(packages[specID][projectID][packageID].token).transfer(address(resourceConverter), amount);
                    uint tokenAmount = resourceConverter.convert(packages[specID][projectID][packageID].amount, packages[specID][projectID][packageID].token, token) + amount;
            
                    packages[specID][projectID][packageID].amount = tokenAmount;
                    packages[specID][projectID][packageID].token = token;
                    emit PaycheckPackage(specID, projectID, packageID, amount, token);
                    return;
                }
            }
            packages[specID][projectID][packageID].amount += amount;
            packages[specID][projectID][packageID].token = token;
            emit PaycheckPackage(specID, projectID, packageID, amount, token);
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
        (uint amount, string[] memory purls) = decodePayload(payload);
        require(amount > 0, "No packages given");
        for (uint i = 1; i <= amount; i++) {
            require(bytes(purls[i-1]).length > 0, "No Auth provider");
            packages[specID][projectID][i].purl = purls[i-1];
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