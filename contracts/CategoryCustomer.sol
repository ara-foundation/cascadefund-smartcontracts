// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { Category } from "./Category.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "hardhat/console.sol";
import { OneTimeDeposit } from "./OneTimeDeposit.sol";

contract CategoryCustomer is Category {
    /**
     * @dev It's used to set in the one time fees, for the latter deployment of the contract
     */
    address public collector;

    mapping(uint => bool) public usedCounters;
    mapping(address => bool) public withdrawnDeposits;

    event Withdraw(uint specID, uint projectID, uint counter, uint amount);

    constructor(address _collector) {
        collector = _collector;
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
    ) external returns (string memory, uint) {
        // Decode the payload
        (uint counter, uint amount, address resourceToken, string memory resourceName) = decodePayload(_payload);
        require(usedCounters[counter] == false, "Counter used");
        uint salt = getSalt(_specID, _projectID, _payload);
        bytes memory oneTimeBytecode = getBytecode();
        address potentialAddress = getAddress(oneTimeBytecode, salt);
        require(withdrawnDeposits[potentialAddress] == false, "Already withdrawn");

        // Generate the salt by combining (counter, amount, resource name, resource token, address(this), chainid, spec and project)
        // Make sure that contract not exists (withdrawnDeposits is false)
        OneTimeDeposit oneTimeDeposit = deploy(salt);
        require(address(oneTimeDeposit) == potentialAddress, "Invalid deployed depositer");

        uint withdrawnAmount = oneTimeDeposit.withdraw(resourceToken, amount, msg.sender);
        require(withdrawnAmount > 0, "Not withdrawn at all");

        usedCounters[counter] = true;
        withdrawnDeposits[potentialAddress] = true;

        emit Withdraw(_specID, _projectID, counter, withdrawnAmount);

        return (resourceName, withdrawnAmount);
    }

    function deploy(uint _salt) public returns(OneTimeDeposit) {
        OneTimeDeposit _contract = new OneTimeDeposit{
            salt: bytes32(_salt)

        }(address(this), collector);

        return _contract;
    }

    function getSalt(uint specID, uint projectID, bytes calldata _payload) public pure returns(uint) {
        bytes32 salt = keccak256(
            abi.encodePacked(
                specID, projectID, _payload
            )
        );
        return uint(salt);
    }

    function getAddress(bytes memory bytecode, uint _salt) public view returns (address) {
        bytes32 initialCode = keccak256(
            abi.encodePacked(
                bytes1(0xff), address(this), _salt, keccak256(bytecode)
            )
        );

        return address (uint160(uint(initialCode)));
    }

    function getBytecode() public view returns (bytes memory) {
        bytes memory bytecode = type(OneTimeDeposit).creationCode;
        return abi.encodePacked(bytecode, abi.encode(address(this), collector));
    }

    function decodePayload(bytes memory payload) public pure returns(uint, uint, address, string memory) {
        (
            uint counter,
            uint amount,
            address resourceToken,
            string memory resourceName
        ) = abi.decode(payload, (uint, uint, address, string));
        require(counter > 0, "Counter can not be 0");
        require(amount > 0, "Amount can not be 0");
        require(bytes(resourceName).length > 0, "Resource name can not be empty");
        require(resourceToken != address(0), "Resource token address can not be empty");
        return (counter, amount, resourceToken, resourceName);
    }
    
    function paycheck(uint, uint, uint, uint, address, uint) external pure {
        revert("Not implemented");
    }
    
    function registerUser(uint, uint, bytes calldata) external pure returns(bool) {
        revert("Not implemented");
    }
}