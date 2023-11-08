import express from 'express';
import { ethers } from 'ethers';
const app = express();
const port = 3000;

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
  
      res.status(200).json({ message: 'Blockchain time updated to now.' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update time.', error: error.message });
    }
  });
  

  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
