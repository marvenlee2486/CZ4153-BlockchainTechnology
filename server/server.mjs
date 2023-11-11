import express from 'express';
import { ethers } from 'ethers';
import helpers from '@nomicfoundation/hardhat-network-helpers';
import cors from 'cors';

const app = express();
const port = 3000;
app.use(cors());
const provider = new ethers.JsonRpcProvider('http://localhost:8545');


// Enable JSON body parsing for POST requests
app.use(express.json());

// Route to set the blockchain time to the current real time
app.post('/updateTimeToNow', async (req, res) => {
    try {
      // Get the current real time
      const now = Math.floor(Date.now() / 1000); // Convert from milliseconds to seconds
      // Find out the current blockchain time
      const currentBlock = await provider.getBlock('latest');
      const blockTime = currentBlock.timestamp;
  
      // Calculate the difference in seconds
      const secondsToAdd = now - blockTime;
  
      // If the difference is positive, increase the blockchain time
      if (secondsToAdd > 0) {
        await provider.send('evm_increaseTime', [secondsToAdd]);
        await provider.send('evm_mine');
      }

      // Fetch the updated blockchain time
      const updatedBlock = await provider.getBlock('latest');
      const blockTimeAfterUpdate = updatedBlock.timestamp;
      // const url = "https://eth-mainnet.g.alchemy.com/v2/ckkU_cezJO4QrrINUPsGpRQVCTPAXJWQ"
      // await helpers.reset(url);
      res.status(200).json({ message: 'Blockchain time updated to now.', blockTime, blockTimeAfterUpdate, secondsToAdd });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update time.', error: error.message });
    }
  });
  

  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
