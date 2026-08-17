import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PlatformAuthProvider } from "../context/PlatformAuthContext";
import { HomePage } from "../features/marketing/HomePage";
import { PricingPage } from "../features/marketing/PricingPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { LoginPage } from "../features/auth/LoginPage";
import { UpgradePage } from "../features/auth/UpgradePage";
import { AdminDashboardPage } from "../features/admin/AdminDashboardPage";

export function App() {
  return (
    <BrowserRouter>
      <PlatformAuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/upgrade" element={<UpgradePage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
        </Routes>
      </PlatformAuthProvider>
    </BrowserRouter>
  );
}
