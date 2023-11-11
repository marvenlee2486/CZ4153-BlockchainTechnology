export async function updateBlockchainTimeToNow() {
    try {
      const response = await fetch('http://localhost:3000/updateTimeToNow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
  
      const data = await response.json();
      console.log(data.message);
    } catch (error) {
      console.error('Error updating blockchain time to now:', error);
    }
  }
  