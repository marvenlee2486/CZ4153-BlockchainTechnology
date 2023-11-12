import React, { createContext, useState, ReactNode } from "react";
import { datastore } from "../Data/datastore";
import { useNavigate } from "react-router-dom";
import { useLocalStorage } from "../Data/useLocalStorage";
import { useContext } from "react";

/**
 * This file defines the UserContext, UserProvider, and useUserContext hook for managing user authentication and data.
 *
 * UserContext:
 *   - A React context that provides a way to pass user data through the component tree without having to pass it down manually at every level.
 *   - Contains the current user's data and functions to manipulate this data, such as login, logout, and checking authentication status.
 *
 * User Interface:
 *   - Describes the shape of the user data used throughout the application.
 *   - Includes fields like uid, username, email, role, and address.
 *
 * UserProvider:
 *   - A component that wraps around part of the application that needs access to user context.
 *   - Manages the user state using the useLocalStorage hook to persist user data over refreshes in the browser's local storage.
 *   - Provides functions for login, logout, clearing user data, and checking if a user is authenticated.
 *   - Any component wrapped by UserProvider can access the user context using the useUserContext hook.
 *
 * useUserContext:
 *   - A custom hook for consuming the UserContext.
 *   - Ensures that the context is used within a UserProvider.
 *   - Simplifies the process of accessing the current user's data and authentication functions in any component.
 *
 * The UserContext is essential for managing user sessions and roles, especially in applications with different user types and permissions.
 */

type role = "user" | "seller";
export interface User {
  uid: number;
  username: string;
  email: string;
  role: role;
  address: string;
}

interface UserContextProps {
  user: User;
  login: (userData: User) => void;
  logout: () => void;
  logoutAndClear: () => void;
  isAuthenticated: () => boolean;
}

const defaultUser: User = {
  uid: -1,
  username: "",
  email: "",
  role: "user",
  address: "",
};

const UserContext = createContext<UserContextProps>({
  user: defaultUser,
  login: () => {},
  logout: () => {},
  logoutAndClear: () => {},
  isAuthenticated: () => false,
});

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useLocalStorage("user", null);
  const navigate = useNavigate();
  const login = (userData: User) => {
    setUser(userData);
    navigate(`/auction/:${userData.uid}`);
  };

  const logout = () => {
    setUser(null);
    navigate("/login", { replace: true });
  };

  const logoutAndClear = () => {
    datastore.clear();
    navigate("/login", { replace: true });
  };

  const isAuthenticated = () => {
    return user !== null && user.uid !== -1;
  };

  const contextValue = {
    user: user || defaultUser,
    login,
    logout,
    logoutAndClear,
    isAuthenticated,
  };

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
};

export default UserContext;
