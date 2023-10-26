// UserContext.tsx
import React, { createContext, useState, ReactNode } from 'react';
import {datastore} from '../helpers/datastore';

interface User {
  uid: number;
  name: string;
  username: string;
  email: string;
  role: string;
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
  const [user, setUser] = useState<User | null>(null);

  const login = (userData: User) => {
    setUser(userData);
    datastore.set('currUser', userData);
    datastore.set(userData.username, userData)
    return true
  };

  const logout = () => {
    setUser(null);
    datastore.remove('currUser');
  };

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;