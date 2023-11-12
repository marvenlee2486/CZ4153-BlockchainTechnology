# Instructions to run the solution

Install latest lts version of node using nvm: nvm install node --lts
If already installed: nvm use --lts

1.

```shell
npm install
```

2. To produce abi code of the latest contract that will interact with frontend, run:

```shell
npx hardhat compile
```

3. Setup local eth blockchain network using node. It will provide pre-funded accounts also.

```shell
npx hardhat node
```

4. Run the frontend on another terminal instance with:

```shell
npm run dev
```

5. Install metamask and add a network.
6. Copy the JSON-RPC server address which should be: http://127.0.0.1:8545/
7. Select "Add network manually" and fill in the relevant details. Chain Id should be 1337.
8. Copy pre-loaded account's private key and import them in metamask.
9. Use Account 0,1,2 for user1, user2, and seller1 respectively
10. Now you will be able to log into the dutch auction frontend application.

Debugging:

1. Once you have made any transactions, metamask will keep a record of them.
2. Thus when you restart your local hardhat blockchain, it will be inconsistent with metamask and thus throw errors.
3. In order to resolve this, you need to go to metamask settings -> advanced -> clear tab activity data for each account you made transactions with.
4. You may also wish to click on "Delete database" to clear all the existing auction and token data tied to the users on the application.

Other Hardhat commands:

```shell
npx hardhat accounts
1. npm install
2. To produce abi code of the latest contract that will interact with frontend, run:
```

npx hardhat compile

```

3. Setup local eth blockchain network using node. It will provide pre-funded accounts also.:
```

npx hardhat node

```

4. Run the frontend code
```

npm run dev

```

# Development
## Test Case Report
To run the test case report together with the reported gas used, run
```

REPORT_GAS=true npx hardhat test

```

## coverage report
To run the coverage report, you may run npx hardhat coverage
```

npx hardhat coverage --solcoverjs ./.solcover.js

```
You may find the coverage report under coverage folder

```
