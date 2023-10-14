const { Web3 } = require('web3');
const web3 = new Web3('http://localhost:7545'); 
const fs = require('fs');
const path = require('path');

const contractJSONFile = 'AxelToken.json';
const contractArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'build', 'contracts', contractJSONFile), 'utf8'));

// Finding contract address, and user address
const contractABI = contractArtifact.abi; // Your ERC-20 contract's ABI
const contractAddress = '0x1c498E7f16478B568a385ef9122Ecf84Ab519BE6'; // Your ERC-20 contract's address
const userAddress = '0xf4EA9122dDbdf5eD1B6DBB2c48439826Ab839772'; // The address you want to check the balance for

// Connect to the contract
const erc20Contract = new web3.eth.Contract(contractABI, contractAddress);

// Call the balanceOf function to get the balance of the userAddress
erc20Contract.methods.balanceOf(userAddress).call()
  .then(balance => {
    console.log(`Balance of ${userAddress}: ${balance}`);
  })
  .catch(error => {
    console.error('Error:', error);
  });


