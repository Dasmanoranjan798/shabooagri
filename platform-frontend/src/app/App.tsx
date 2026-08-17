import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PlatformAuthProvider } from "../context/PlatformAuthContext";
import { RegisterPage } from "../features/auth/RegisterPage";
import { LoginPage } from "../features/auth/LoginPage";

export function App() {
  return (
    <BrowserRouter>
      <PlatformAuthProvider>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          {/* Home/Pricing land in Checkpoint 2; for now the root sends a
              visitor straight to registration rather than a dead end. */}
          <Route path="/" element={<Navigate to="/register" replace />} />
          <Route path="*" element={<Navigate to="/register" replace />} />
        </Routes>
      </PlatformAuthProvider>
    </BrowserRouter>
  );
}
