import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MsalProvider } from "@azure/msal-react";
import "./index.css";

import { msal } from "./auth/msal";
import { AuthProvider } from "./auth/AuthProvider";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MsalProvider instance={msal}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </MsalProvider>
  </StrictMode>
);
