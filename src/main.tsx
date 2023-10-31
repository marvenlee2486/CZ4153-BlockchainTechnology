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
import TestPage from "./pages/TestPage";
import { ProtectedLayout } from "./pages/ProtectedLayout";
import { UserProvider } from "./helpers/UserContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <Routes>
          <Route path="/test" element={<ErrorPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedLayout />}>
            <Route path="" element={<RootLayout />}>
              <Route path="dashboard/:uid" element={<Dashboard />} />
              <Route path="test/:uid" element={<TestPage />} />
            </Route>
          </Route>
        </Routes>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);
