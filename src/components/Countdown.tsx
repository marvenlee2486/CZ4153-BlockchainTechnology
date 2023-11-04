import React, { useEffect, useState } from "react";

interface CountdownProps {
  endTime: number;
}

const Countdown: React.FC<CountdownProps> = ({ endTime }) => {
  const [timeRemaining, setTimeRemaining] = useState(endTime - Date.now());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeRemaining(endTime - Date.now());
    }, 1000); // Update every 1000 milliseconds (1 second)

    return () => clearInterval(intervalId); // Clear the interval on component unmount
  }, [endTime]); // Dependency array ensures that the interval is reset if auction.endTime changes

  return <div>Time Remaining: {timeRemaining} milliseconds</div>;
};

export default Countdown;
