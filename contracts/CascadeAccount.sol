// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { StringUtils } from "./StringUtils.sol";
import { AccessControlUpgradeable } from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/**
 * @title CascadeAccount to track the indirect incoming tokens
 * @author Medet Ahmetson
 * @notice
 */
contract CascadeAccount is AccessControlUpgradeable {
    struct Account {
        address token;
        uint amount;
        string purl;
        string username;
        string authProvider;
        address withdrawer;
        mapping(address => uint) balances;
    }

    mapping(string => Account) public cascadeAccounts;

    bytes32 public constant SERVER_ROLE = keccak256("SERVER_ROLE");
    bytes32 public constant WITHDRAWER_ROLE = keccak256("WITHDRAWER_ROLE");
    bytes32 public constant HYPERPAYMENT_ROLE = keccak256("CATEGORY_ROLE");

    event CascadePaycheck(string indexed purl, address token, uint amount, uint specID, uint projectID, uint splineID);

    modifier onlyWithdrawer(string memory purl) {
        require(cascadeAccounts[purl].withdrawer == msg.sender || hasRole(WITHDRAWER_ROLE, msg.sender), "Not withdrawer");
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
     * View
     * 
     ***********************************************************************/

    function balanceOf(string memory purl, address token) public view returns(uint) {
        return cascadeAccounts[purl].balances[token];
    }

    /**********************************************************************
     * 
     * Control by the server
     * 
     ***********************************************************************/

    /**
     * Set the PURL's maintainer information
     * @param purl Unique package manager
     * @param _addr wallet address that withdraws the tokens
     * @param _username user name
     * @param _authProvider authentication provider
     */
    function setMaintainer(
        string memory purl, 
        address _addr, 
        string calldata _username, 
        string calldata _authProvider
    ) external onlyRole(SERVER_ROLE) {
        if (cascadeAccounts[purl].withdrawer != _addr) {
            cascadeAccounts[purl].withdrawer = _addr;
        }
        if (!StringUtils.equal(cascadeAccounts[purl].username, _username)) {
            cascadeAccounts[purl].username = _username;
            cascadeAccounts[purl].authProvider = _authProvider;
        }
    }

    /**********************************************************************
     * 
     * User related operations
     * - requires WITHDRAW_ROLE
     * 
     ***********************************************************************/

    /**
     * Withdraw the tipped tokens
     * @param purl package ID on web
     * @param token address of the token
     */
    function withdrawAllToken(string memory purl, address token) external onlyWithdrawer(purl) {
        require(balanceOf(purl, token) > 0, "No tokens");

        IERC20(token).transfer(msg.sender, cascadeAccounts[purl].balances[token]);
        cascadeAccounts[purl].balances[token] = 0;
    }

    /**********************************************************************
     * 
     * Other hyperpayment smartcontracts
     * 
     ***********************************************************************/

    /**
     * Cascaded paycheck receives few tips from the user.
     * @param purl package url on web
     * @param token crypto address
     * @param amount of crypto cascaded to the package
     * @param specID hyperpayment specification
     * @param projectID project that cascaded
     * @param splineID spline that initiated the spline id
     */
    function cascadePaycheck(
        string memory purl, 
        address token, 
        uint amount, 
        uint specID, 
        uint projectID, 
        uint splineID
    ) external onlyRole(HYPERPAYMENT_ROLE) {
        cascadeAccounts[purl].balances[token] += amount;

        emit CascadePaycheck(purl, token, amount, specID, projectID, splineID);
    }
}
