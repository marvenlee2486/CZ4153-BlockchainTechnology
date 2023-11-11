export async function updateBlockchainTimeToNow() {
    try {
      const response = await fetch('http://localhost:3000/updateTimeToNow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      function convertTimestampToLocalDateTime(timestamp) {
        // Create a new Date object using the timestamp (multiplied by 1000 to convert from seconds to milliseconds)
        const date = new Date(timestamp * 1000);
    
        // Use toLocaleString() to convert to a readable local date-time format
        return date.toLocaleTimeString();
      }
  
      const data = await response.json();
      const blockTime = convertTimestampToLocalDateTime(data.blockTime);
      const blockTimeAfterUpdate = convertTimestampToLocalDateTime(data.blockTimeAfterUpdate);
      const now = convertTimestampToLocalDateTime(data.now);
      console.log(data.message);
      console.log('Seconds added:', data.secondsToAdd);
      console.log('Current blockchain time:', blockTime);
      console.log('Blockchain time after update:', blockTimeAfterUpdate);
      console.log('Current real time:', now);
    } catch (error) {
      console.error('Error updating blockchain time to now:', error);
    }
  }
  