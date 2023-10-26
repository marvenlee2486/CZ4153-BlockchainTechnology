// LoginPage.tsx
import React, { useContext } from 'react';
import UserContext from '../context/UserContext';  // Adjust the import path if necessary
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useContext(UserContext);

  const userStore = [
    {uid: 0, name: "User 1", username: "user1", email: "user1@gmail.com", role: "user"},
    {uid: 1, name: "User 2", username: "user2", email: "user2@gmail.com", role: "user"},
    {uid: 2, name: "Seller 1", username: "seller1", email: "seller1@gmail.com", role: "seller"},
  ];

  const handleLogin = (user: any) => {  // Type 'any' can be replaced with the 'User' interface if it's exported from UserContext.tsx
    const success = login(user);
    if (success) {
      navigate(`/dashboard/${user.uid}`);
    }
  };

  return (
    <div className="flex items-center justify-center w-full h-screen bg-gray-200">
      <div className="w-60 xl flex flex-col items-center justify-center h-40 gap-1 p-5 bg-white rounded-sm">
      <h2>Select a User to Login</h2>
        {userStore.map(user => (
          <button className=' w-20 text-white bg-blue-600 rounded-md' key={user.uid} onClick={() => handleLogin(user)}>
            {user.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LoginPage;
