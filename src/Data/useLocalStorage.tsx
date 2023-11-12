import { useState } from "react";

/**
 * This file exports the useLocalStorage hook, which is used to sync state with local storage in a React application.
 *
 * @param keyName The key under which the data will be stored in local storage.
 * @param defaultValue (any): The initial value to be set in the state and local storage if no value is already stored.
 *
 * @returns (array):
 *  - storedValue (any): The current state value, either retrieved from local storage or set to defaultValue.
 *  - setValue (function): A function to update the state and local storage value.
 *
 * Usage:
 *   The hook is used in a similar manner to useState. The state is also persisted in the browser's local storage,
 *   ensuring that the state persists across component remounts and page reloads.
 *
 * Note:
 *   - The hook handles parsing and stringifying of values to and from JSON for storage in local storage.
 *   - If an error occurs during these operations, the default value is used.
 */

export const useLocalStorage = (keyName: string, defaultValue: any) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const value = window.localStorage.getItem(keyName);
      if (value) {
        return JSON.parse(value);
      } else {
        window.localStorage.setItem(keyName, JSON.stringify(defaultValue));
        return defaultValue;
      }
    } catch (err) {
      return defaultValue;
    }
  });
  const setValue = (newValue: any) => {
    try {
      window.localStorage.setItem(keyName, JSON.stringify(newValue));
    } catch (err) {}
    setStoredValue(newValue);
  };
  return [storedValue, setValue];
};
