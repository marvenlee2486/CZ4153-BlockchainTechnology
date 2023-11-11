import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  Routes,
  Route,
  BrowserRouter,
} from "react-router-dom";
import "./index.css";
import LoginPage from "./pages/LoginPage";
import RootLayout, { loader as rootLoader } from "./pages/RootLayout";
import ErrorPage from "./pages/ErrorPage";
import Dashboard from "./pages/Dashboard";
import AuctionPage from "./pages/AuctionPage";
import { ProtectedLayout } from "./pages/ProtectedLayout";
import { UserProvider } from "./helpers/UserContext";
import { Web3ReactProvider, Web3ReactHooks } from "@web3-react/core";
import type { MetaMask } from "@web3-react/metamask";
import { hooks as metaMaskHooks, metaMask } from "./helpers/connector";
const connectors: [MetaMask, Web3ReactHooks][] = [[metaMask, metaMaskHooks]];

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Web3ReactProvider connectors={connectors}>
        <UserProvider>
          <Routes>
            <Route path="/test" element={<ErrorPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="" element={<ProtectedLayout />}>
              <Route path="" element={<RootLayout />}>
                <Route path="auction/:uid" element={<AuctionPage />} />
                <Route path="dashboard/:uid" element={<Dashboard />} />
              </Route>
            </Route>
          </Routes>
        </UserProvider>
      </Web3ReactProvider>
    </BrowserRouter>
  </React.StrictMode>
);
