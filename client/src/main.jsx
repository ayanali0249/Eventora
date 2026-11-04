import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import NotificationProvider from "./context/NotificationContext";

import App from './App'
import './index.css'

import AuthProvider from "./context/AuthContext";
import WishlistProvider from "./context/WishlistContext";
import CompareProvider from "./context/CompareContext";
import { Toaster } from "react-hot-toast";

// NotificationProvider reads the logged-in user/token from AuthContext (to
// know who to fetch notifications for and open the live socket as), so it
// must be nested INSIDE AuthProvider, not outside it. CompareProvider has
// no such dependency - the comparison tray is plain client-side state open
// to guests too - so its position in the tree doesn't matter functionally;
// it's nested alongside WishlistProvider since both back a vendor-card
// toggle button.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>

  <AuthProvider>

    <NotificationProvider>

      <WishlistProvider>

        <CompareProvider>

          <BrowserRouter>

            <Toaster
              position="top-right"
              reverseOrder={false}
            />

            <App />

          </BrowserRouter>

        </CompareProvider>

      </WishlistProvider>

    </NotificationProvider>

  </AuthProvider>

</React.StrictMode>
)