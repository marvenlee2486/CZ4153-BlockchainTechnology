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

Other Hardhat commands:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
node scripts/sample-script.js
npx hardhat help
```


```
npx hardhat coverage --solcoverjs ./.solcover.js
```

```
REPORT_GAS=true npx hardhat test
```

```
npm run dev
```

```
npx hardhat 
```