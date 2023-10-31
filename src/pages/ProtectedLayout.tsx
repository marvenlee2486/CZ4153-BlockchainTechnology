import { Outlet, useLoaderData, Navigate } from "react-router-dom";
import UserContext from "../helpers/UserContext";
import { useContext, ReactNode } from "react";

export const ProtectedLayout = () => {
  const { user } = useContext(UserContext) ?? {};
  if (!user) {
    console.log("user not logged in");
    return <Navigate to="/login" />;
  }
  return <Outlet />;
};
