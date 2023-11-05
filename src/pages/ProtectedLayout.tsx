import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { ethers } from "ethers";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "../helpers/UserContext";
import React from "react";
export const ProtectedLayout = React.memo(() => {
  const navigate = useNavigate();
  const { isAuthenticated } = useUserContext();

  useEffect(() => {
    if (!isAuthenticated()) {
      alert("not logged in");
      navigate("/login");
    }
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (typeof window?.ethereum !== "undefined") {
      const provider = new ethers.BrowserProvider(window?.ethereum);
      const accounts = await provider.listAccounts();
      if (accounts.length === 0) {
        navigate("/login");
      }
    }
  };
  return <Outlet />;
});
