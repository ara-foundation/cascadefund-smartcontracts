# CascadeFund and Hyperpayment implementation
Implementation of the cascadefund's donatation distribution via [hyperpayment](https://hyperpayment.org/)
protocol as a EVM based blockchain smartcontracts.

#### TODO

#### Update
- CategoryBusiness._wthidraw should mark withdrawer not msg.sender
  Otherwise, it can not be withdrawn by the server
- Revoke the server contract from revoking

##### V2
- OneTimeDeposit in CategoryCustomer should be set in the initializer, and we can update it later as a manager.
- Implement token converter
- implement the deploy smartcontracts following 
---

## Deployed addresses

* `StringUtils` &ndash; a string related **library** on *BaseSepolia*: [contracts/StringUtils.sol:StringUtils](https://sepolia.basescan.org/address/0x9b69E72D065600f552916Da94023F5B8A423b716#code)
* `CascadeAccount` &ndash; a smartcontract to indirectly collect tips from all donations on *BaseSepolia*: [explorer](https://sepolia.basescan.org/address/0xe6c77Aa2796d7446e0433fd959B6E8a0F949971e#code)
* `CategoryBusiness` &ndash; a smartcontract to collect donations on *BaseSepolia*: [explorer](https://sepolia.basescan.org/address/0xB524542AD87879E9429cc7B51100201661ce9cC9#code)
* `CategorySBOM` &ndash; a smartcontract to redirect dependencies donations to `CascadeFund` on *BaseSepolia*: [explorer](https://sepolia.basescan.org/address/0xCD15aC7Ae86e507E092c0F92C288e76A17864d1F#code)
* `CategoryCustomer` &ndash; a smartcontract to collect donations from users by creating unique smartcontract for each transaction on *BaseSepolia*: [explorer](https://sepolia.basescan.org/address/0x239498f4940f2C162aE7Cbb5984DEFF536b12c03#code)
* `HyperpaymentV1` &ndash; a smartcontract of the hyperpayment protocol on *BaseSepolia*: [0x8f7144A38C2AfbFedebc71d1211aEdf15e00413F](https://sepolia.basescan.org/address/0xD6285Ab40a99327CEfc344C88932bB27C4fCeF49#code)
* `TestToken` &ndash; a FakeUSDC (fUSDC) imitating stable coins on *BaseSepolia*: [contracts/TestToken.sol:TestToken](https://sepolia.basescan.org/address/0xE4A6f0aba700F7964599c7Cd21b9c17Bf3fab988#code)

## Guide
Try running the following
```shell
npx hardhat test
npx hardhat run scripts/deploy-cascade-account.ts --network baseSepolia
npx hardhat run scripts/initial-link.ts --network baseSepolia
npx hardhat run scripts/opensource.hyperpayment.spec.ts --network baseSepolia
```

## Links
- Official [Hardhat Upgradeable deployment and updates](https://hardhat.org/ignition/docs/guides/upgradeable-proxies) documentation.