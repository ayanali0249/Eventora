import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import NotificationProvider from "./context/NotificationContext";

import App from './App'
import './index.css'

import AuthProvider from "./context/AuthContext";
import { Toaster } from "react-hot-toast";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>

  <NotificationProvider>

    <AuthProvider>

      <BrowserRouter>

        <Toaster
          position="top-right"
          reverseOrder={false}
        />

        <App />

      </BrowserRouter>

    </AuthProvider>

  </NotificationProvider>

</React.StrictMode>
)