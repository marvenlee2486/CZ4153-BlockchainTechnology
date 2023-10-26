import React from 'react'
import ReactDOM from 'react-dom/client'
import {createBrowserRouter,RouterProvider} from 'react-router-dom'
import './index.css'
import LoginPage from './pages/LoginPage'
import RootLayout, {loader as rootLoader} from './pages/RootLayout'
import ErrorPage from "./pages/ErrorPage";
import Dashboard from './components/Dashboard'
import PrivateRoute from './pages/PrivateRoute'
import { UserProvider } from './context/UserContext'

const router = createBrowserRouter([
  {
    path: '/',
    element:<PrivateRoute><RootLayout /></PrivateRoute> ,
    errorElement: <ErrorPage />,
    loader: rootLoader,
    children: [
      { path: 'dashboard/:uid', element: <Dashboard />, errorElement: <ErrorPage /> },
    ],
  },
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <ErrorPage />,
  }
])

ReactDOM.createRoot(document.getElementById('root')!).render(

  <React.StrictMode>
    <UserProvider>
    <RouterProvider router={router}/>
    </UserProvider>
  </React.StrictMode>,
)
