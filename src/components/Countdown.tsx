import React, { useEffect, useState } from "react";

interface CountdownProps {
  endTime: number; // ms since epoch
  countdownCallback: () => void;
}

const Countdown: React.FC<CountdownProps> = ({
  endTime,
  countdownCallback,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(endTime - Date.now());

  function getTimeRemaining() {
    if (timeRemaining <= 0) {
      return "00:00:00:00"; // Adjusted to return zeros if the endTime has passed
    }

    const totalSeconds = Math.floor(timeRemaining / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);

    const days = totalDays;
    const hours = totalHours % 24; // Modulus 24 to get the remainder hours
    const minutes = totalMinutes % 60; // Modulus 60 to get the remainder minutes
    const seconds = totalSeconds % 60; // Modulus 60 to get the remainder seconds

    return `
    ${days.toString().padStart(2, "0")}:${hours
      .toString()
      .padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeRemaining(endTime - Date.now());
    }, 1000); // Update every 1000 milliseconds (1 second)

    return () => clearInterval(intervalId); // Clear the interval on component unmount
  }, [endTime]); // Dependency array ensures that the interval is reset if auction.endTime changes

  return <div>Time Remaining: {getTimeRemaining()} (DD:HH:mm:ss)</div>;
};

export default Countdown;
