// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title OneTimeDeposit
 * @author Medet Ahmetson
 * @notice Create it with the unique salt to receive the tokens from the users.
 */
contract OneTimeDeposit {
    address public owner;
    address public collector;
    bool public withdrawn;

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier onlyCollector() {
        require(msg.sender == collector);
        _;
    }

    constructor(address _owner, address _collector) {
        owner = _owner;
        collector = _collector;
    }

    function withdraw(address _token, uint _minAmount, address _to) external onlyOwner() returns(uint) {
        require(withdrawn == false, "already withdrawn");
        IERC20 token = IERC20(_token);
        uint balance = token.balanceOf(address(this));
        require(balance >= _minAmount, "no token given");
        token.transfer(_to, balance);
        withdrawn = true;
        return balance;
    }

    function withdrawByCollector(address _token) external onlyCollector() {
        IERC20 token = IERC20(_token);
        uint balance = token.balanceOf(address(this));
        require(balance > 0, "no token given");
        token.transfer(msg.sender, balance);
    }
}