import React, { useEffect, useState } from "react";

/**
 * This component is used to display a countdown timer.
 * It takes in an expiresAt timestamp and a callback function to be called when the timer reaches zero and every 10s
 * It also takes in a calculateDiscountedPrice function to be called every second to update the discounted price.
 * It exports a getTimeRemaining function that can be used to get the time remaining in a readable format.
 */
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
    if (expiresAt <= Date.now()) {
      countdownCallback();
      return;
    }
    const intervalId = setInterval(() => {
      const newTimeRemaining = expiresAt - Date.now();
      setTimeRemaining(expiresAt - Date.now());
      calculateDiscountedPrice();
      if (newTimeRemaining <= 0) {
        clearInterval(intervalId); // Stop the interval
        countdownCallback(); // Call the countdown callback
      }
    }, 1000); // Update every 1000 milliseconds (1 second)

    // Separate interval for triggering countdown callback every 10 seconds
    const callbackIntervalId = setInterval(() => {
      countdownCallback();
    }, 10000); // Trigger every 10 seconds
    return () => {
      clearInterval(callbackIntervalId);
      clearInterval(intervalId);
    };
  }, [expiresAt]); // Dependency array ensures that the interval is reset if auction.expiresAt changes

  return (
    <div>Time Remaining: {getTimeRemaining(timeRemaining)} (DD:HH:MM:SS)</div>
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
  ${days.toString().padStart(2, "0")}D:${hours
    .toString()
    .padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}
