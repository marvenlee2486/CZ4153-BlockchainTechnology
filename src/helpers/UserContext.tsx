// UserContext.tsx
import React, { createContext, useState, ReactNode } from "react";
import { datastore } from "../Data/datastore";
import { useNavigate } from "react-router-dom";
import { useLocalStorage } from "../Data/useLocalStorage";
type role = "user" | "seller" | "admin";

export interface User {
  uid: number;
  username: string;
  email: string;
  role: role;
  address: string;
}

interface UserContextProps {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextProps | null>(null);

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

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;
