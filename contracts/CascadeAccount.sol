// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { StringUtils } from "./StringUtils.sol";

/**
 * @title CascadeAccount to track the indirect incoming tokens
 * @author Medet Ahmetson
 * @notice
 */
contract CascadeAccount {
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

    event CascadePaycheck(string indexed purl, address token, uint amount, uint specID, uint projectID, uint splineID);

    modifier onlyWithdrawer(string memory purl) {
        require(cascadeAccounts[purl].withdrawer == msg.sender, "Not withdrawer");
        _;
    }

    constructor() {
    }

    function balanceOf(string memory purl, address token) public view returns(uint) {
        return cascadeAccounts[purl].balances[token];
    }

    function setMaintainer(string memory purl, address _addr, string calldata _username, string calldata _authProvider) external {
        if (cascadeAccounts[purl].withdrawer != _addr) {
            cascadeAccounts[purl].withdrawer = _addr;
        }
        if (!StringUtils.equal(cascadeAccounts[purl].username, _username)) {
            cascadeAccounts[purl].username = _username;
            cascadeAccounts[purl].authProvider = _authProvider;
        }
    }

    function withdrawAllToken(string memory purl, address token) external onlyWithdrawer(purl) {
        require(balanceOf(purl, token) > 0, "No tokens");

        IERC20(token).transfer(msg.sender, cascadeAccounts[purl].balances[token]);
        cascadeAccounts[purl].balances[token] = 0;
    }

    function cascadePaycheck(string memory purl, address token, uint amount, uint specID, uint projectID, uint splineID) external {
        cascadeAccounts[purl].balances[token] += amount;

        emit CascadePaycheck(purl, token, amount, specID, projectID, splineID);
    }
}
