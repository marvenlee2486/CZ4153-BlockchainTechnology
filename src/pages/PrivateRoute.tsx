import React from 'react';
import { Route, Navigate, RouteProps } from 'react-router-dom';
import UserContext from '../context/UserContext';

const PrivateRoute: React.FC<RouteProps> = (props) => {
  const userContext = React.useContext(UserContext);

  if (!userContext || !userContext.user) {
    // Not logged in, redirect to login page
    return <Navigate to="/login" />;
  }

  return <Route {...props} />;
};

export default PrivateRoute;