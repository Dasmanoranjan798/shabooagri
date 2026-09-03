import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PlatformAuthProvider } from "../context/PlatformAuthContext";
import { HomePage } from "../features/marketing/HomePage";
import { PricingPage } from "../features/marketing/PricingPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { LoginPage } from "../features/auth/LoginPage";
import { UpgradePage } from "../features/auth/UpgradePage";
import { ResetPasswordPage } from "../features/auth/ResetPasswordPage";
import { AcceptInvitePage } from "../features/auth/AcceptInvitePage";
import { ChangePasswordPage } from "../features/auth/ChangePasswordPage";
import { AdminDashboardPage } from "../features/admin/AdminDashboardPage";
import { CustomerListPage } from "../features/admin/CustomerListPage";
import { CustomerDetailPage } from "../features/admin/CustomerDetailPage";
import { FeedbackPage } from "../features/marketing/FeedbackPage";
import { ContactPage } from "../features/marketing/ContactPage";
import { TermsOfServicePage } from "../features/legal/TermsOfServicePage";
import { PrivacyPolicyPage } from "../features/legal/PrivacyPolicyPage";
import { RefundPolicyPage } from "../features/legal/RefundPolicyPage";
import { DownloadAppPage } from "../features/marketing/DownloadAppPage";

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
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/customers" element={<CustomerListPage />} />
          <Route path="/admin/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/refund-policy" element={<RefundPolicyPage />} />
          <Route path="/app" element={<DownloadAppPage />} />
        </Routes>
      </PlatformAuthProvider>
    </BrowserRouter>
  );
}
