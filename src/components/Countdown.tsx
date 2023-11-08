import React, { useEffect, useState } from "react";

interface CountdownProps {
  expiresAt: number; // ms since epoch
  countdownCallback: () => void;
  calculateDiscountedPrice: () => void;
}

const Countdown: React.FC<CountdownProps> = ({
  expiresAt,
  countdownCallback,
  calculateDiscountedPrice,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(expiresAt - Date.now());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeRemaining(expiresAt - Date.now());
      calculateDiscountedPrice();
    }, 1000); // Update every 1000 milliseconds (1 second)

    return () => clearInterval(intervalId); // Clear the interval on component unmount
  }, [expiresAt]); // Dependency array ensures that the interval is reset if auction.expiresAt changes

  return (
    <div>Time Remaining: {getTimeRemaining(timeRemaining)} (DD:HH:mm:ss)</div>
  );
};
export default Countdown;

export function getTimeRemaining(timeRemaining: number) {
  if (timeRemaining <= 0) {
    return "00:00:00:00"; // Adjusted to return zeros if the expiresAt has passed
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
