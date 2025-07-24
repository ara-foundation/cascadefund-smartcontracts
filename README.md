# CascadeFund and Hyperpayment implementation
Implementation of the cascadefund's donatation distribution via [hyperpayment](https://hyperpayment.org/)
protocol as a EVM based blockchain smartcontracts.

#### TODO

##### V2
- OneTimeDeposit in CategoryCustomer should be set in the initializer, and we can update it later as a manager.
- Implement token converter
- implement the deploy smartcontracts following 
---

## Deployed addresses

* `StringUtils` &ndash; a string related **library** on *BaseSepolia*: [contracts/StringUtils.sol:StringUtils](https://sepolia.basescan.org/address/0x9b69E72D065600f552916Da94023F5B8A423b716#code)
* `CascadeAccount` &ndash; a smartcontract to indirectly collect tips from all donations on *BaseSepolia*: [@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy](https://sepolia.basescan.org/address/0x573209D42d347489eA425Df444Df417Ba783c657#code)
* `CategoryBusiness` &ndash; a smartcontract to collect donations on *BaseSepolia*: [@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy](https://sepolia.basescan.org/address/0xfc1d17F71B81e82aBd861A6A5a02Fd9EEa0A643c#code)
* `CategorySBOM` &ndash; a smartcontract to redirect dependencies donations to `CascadeFund` on *BaseSepolia*: [@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy](https://sepolia.basescan.org/address/0x845f57C038d0205c88D6BC19138b860c69F8E192#code)
* `CategoryCustomer` &ndash; a smartcontract to collect donations from users by creating unique smartcontract for each transaction on *BaseSepolia*: [@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy](https://sepolia.basescan.org/address/0x120891bEb44c0F448f71489Ad14e65B557E10EEb#code)
* `CategoryCustomer` &ndash; a smartcontract to collect donations from users by creating unique smartcontract for each transaction on *BaseSepolia*: [@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy](https://sepolia.basescan.org/address/0x120891bEb44c0F448f71489Ad14e65B557E10EEb#code)
* `HyperpaymentV1` &ndash; a smartcontract of the hyperpayment protocol on *BaseSepolia*: [@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy](https://sepolia.basescan.org/address/0xD6285Ab40a99327CEfc344C88932bB27C4fCeF49#code)
* `TestToken` &ndash; a FakeUSDC (fUSDC) imitating stable coins on *BaseSepolia*: [contracts/TestToken.sol:TestToken](https://sepolia.basescan.org/address/0xE4A6f0aba700F7964599c7Cd21b9c17Bf3fab988#code)


## Guide
Try running the following
```shell
npx hardhat test
npx hardhat ignition deploy ./ignition/modules/Lock.ts --network baseSepolia --verify
npx hardhat ignition verify chain-84532
npx hardhat run scripts/initial-link.ts --network baseSepolia
npx hardhat run scripts/opensource.hyperpayment.spec.ts --network baseSepolia
```

## Links
- Official [Hardhat Upgradeable deployment and updates](https://hardhat.org/ignition/docs/guides/upgradeable-proxies) documentation.