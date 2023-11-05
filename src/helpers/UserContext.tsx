// UserContext.tsx
import React, { createContext, useState, ReactNode } from "react";
import { datastore } from "../Data/datastore";
import { useNavigate } from "react-router-dom";
import { useLocalStorage } from "../Data/useLocalStorage";
import { useContext } from "react";

type role = "user" | "seller" | "admin";

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
    navigate(`/test/:${userData.uid}`);
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
