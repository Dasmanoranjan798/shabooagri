import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { SaasAuthProvider } from "../context/SaasAuthContext";
import { AppLayout } from "../layouts/AppLayout";
import { DriverLayout } from "../layouts/DriverLayout";
import { FarmerPortalLayout } from "../layouts/FarmerPortalLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { ProtectedSaasRoute } from "./ProtectedSaasRoute";

// Operational Surface Pages
import { LoginPage } from "../features/auth/LoginPage";
import { ResetPasswordPage } from "../features/auth/ResetPasswordPage";
import { SsoCallbackPage } from "../features/auth/SsoCallbackPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { BookingsPage } from "../features/bookings/BookingsPage";
import { JobsPage } from "../features/jobs/JobsPage";
import { MachinesPage } from "../features/machines/MachinesPage";
import { DriversPage } from "../features/drivers/DriversPage";
import { CustomersPage } from "../features/customers/CustomersPage";
import { EmployeesPage } from "../features/employees/EmployeesPage";
import { PaymentsPage } from "../features/payments/PaymentsPage";
import { ExpensesPage } from "../features/expenses/ExpensesPage";
import { FuelPage } from "../features/fuel/FuelPage";
import { MaintenancePage } from "../features/maintenance/MaintenancePage";
import { ReportsPage } from "../features/reports/ReportsPage";
import { SettingsPage } from "../features/settings/SettingsPage";

// Driver surface pages
import { DriverHomePage } from "../features/driver/DriverHomePage";
import { DriverJobsPage } from "../features/driver/DriverJobsPage";
import { DriverJobDetailPage } from "../features/driver/DriverJobDetailPage";
import { DriverProfilePage } from "../features/driver/DriverProfilePage";

// Farmer/Customer portal surface pages
import { FarmerHomePage } from "../features/farmer/FarmerHomePage";
import { FarmerBookingsPage } from "../features/farmer/FarmerBookingsPage";
import { FarmerInvoicesPage } from "../features/farmer/FarmerInvoicesPage";
import { FarmerProfilePage } from "../features/farmer/FarmerProfilePage";

// Commercial SaaS Public Marketing Pages (§12)
import { SaasHomePage } from "../features/saas/public/SaasHomePage";
import { SaasFeaturesPage } from "../features/saas/public/SaasFeaturesPage";
import { SaasSolutionsPage } from "../features/saas/public/SaasSolutionsPage";
import { SaasPricingPage } from "../features/saas/public/SaasPricingPage";
import { SaasAboutPage } from "../features/saas/public/SaasAboutPage";
import { SaasContactPage } from "../features/saas/public/SaasContactPage";
import { SaasFaqPage } from "../features/saas/public/SaasFaqPage";

// Commercial SaaS Auth Pages
import { SaasLoginPage } from "../features/saas/auth/SaasLoginPage";
import { SaasRegisterPage } from "../features/saas/auth/SaasRegisterPage";

// Commercial SaaS Customer Portal Pages
import { SaasPortalDashboard } from "../features/saas/portal/SaasPortalDashboard";
import { SaasPortalLicense } from "../features/saas/portal/SaasPortalLicense";
import { SaasPortalPayments } from "../features/saas/portal/SaasPortalPayments";
import { SaasPortalProfile } from "../features/saas/portal/SaasPortalProfile";
import { SaasPortalAccount } from "../features/saas/portal/SaasPortalAccount";
import { SaasPortalSoftwareAccess } from "../features/saas/portal/SaasPortalSoftwareAccess";
import { SaasPortalSupport } from "../features/saas/portal/SaasPortalSupport";
import { SaasPortalFeedback } from "../features/saas/portal/SaasPortalFeedback";

// Platform Admin Control Plane Pages (§11 Admin)
import { SaasAdminDashboardPage } from "../features/saas/admin/SaasAdminDashboardPage";
import { SaasAdminCustomersPage } from "../features/saas/admin/SaasAdminCustomersPage";
import { SaasAdminLicensesPage } from "../features/saas/admin/SaasAdminLicensesPage";
import { SaasAdminPaymentsPage } from "../features/saas/admin/SaasAdminPaymentsPage";
import { SaasAdminLeadsPage } from "../features/saas/admin/SaasAdminLeadsPage";
import { SaasAdminEnquiriesPage } from "../features/saas/admin/SaasAdminEnquiriesPage";
import { SaasAdminFeedbackPage } from "../features/saas/admin/SaasAdminFeedbackPage";

import { isTenantSubdomain } from "../lib/saasApi";

function RootRoute() {
  const { roleKey } = useAuth();
  if (roleKey === "driver") {
    return <Navigate to="/driver" replace />;
  }
  if (roleKey === "farmer") {
    return <Navigate to="/portal" replace />;
  }
  return (
    <AppLayout>
      <DashboardPage />
    </AppLayout>
  );
}

function SmartRootRoute() {
  if (!isTenantSubdomain()) {
    return <SaasHomePage />;
  }
  return (
    <ProtectedRoute>
      <RootRoute />
    </ProtectedRoute>
  );
}

function SmartLoginRoute() {
  if (!isTenantSubdomain()) {
    return <SaasLoginPage />;
  }
  return <LoginPage />;
}

export function App() {
  return (
    <BrowserRouter>
      <SaasAuthProvider>
        <AuthProvider>
          <Routes>
            {/* Commercial SaaS Public Marketing Website */}
            <Route path="/saas" element={<SaasHomePage />} />
            <Route path="/features" element={<SaasFeaturesPage />} />
            <Route path="/saas/features" element={<SaasFeaturesPage />} />
            <Route path="/solutions" element={<SaasSolutionsPage />} />
            <Route path="/saas/solutions" element={<SaasSolutionsPage />} />
            <Route path="/pricing" element={<SaasPricingPage />} />
            <Route path="/saas/pricing" element={<SaasPricingPage />} />
            <Route path="/about" element={<SaasAboutPage />} />
            <Route path="/saas/about" element={<SaasAboutPage />} />
            <Route path="/contact" element={<SaasContactPage />} />
            <Route path="/saas/contact" element={<SaasContactPage />} />
            <Route path="/faq" element={<SaasFaqPage />} />
            <Route path="/saas/faq" element={<SaasFaqPage />} />

            {/* Commercial SaaS Auth & Aliases */}
            <Route path="/register" element={<SaasRegisterPage />} />
            <Route path="/saas/register" element={<SaasRegisterPage />} />
            <Route path="/saas/login" element={<SaasLoginPage />} />

            {/* Single Sign-On Callback Route */}
            <Route path="/sso-callback" element={<SsoCallbackPage />} />

            {/* Commercial SaaS Customer Portal & Root Aliases */}
            <Route
              path="/portal"
              element={
                <ProtectedSaasRoute>
                  <SaasPortalDashboard />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/saas/portal"
              element={
                <ProtectedSaasRoute>
                  <SaasPortalDashboard />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/portal/license"
              element={
                <ProtectedSaasRoute>
                  <SaasPortalLicense />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/saas/portal/license"
              element={
                <ProtectedSaasRoute>
                  <SaasPortalLicense />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/portal/payments"
              element={
                <ProtectedSaasRoute>
                  <SaasPortalPayments />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/saas/portal/payments"
              element={
                <ProtectedSaasRoute>
                  <SaasPortalPayments />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/portal/profile"
              element={
                <ProtectedSaasRoute>
                  <SaasPortalProfile />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/saas/portal/profile"
              element={
                <ProtectedSaasRoute>
                  <SaasPortalProfile />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/portal/account"
              element={
                <ProtectedSaasRoute>
                  <SaasPortalAccount />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/saas/portal/account"
              element={
                <ProtectedSaasRoute>
                  <SaasPortalAccount />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/portal/software"
              element={
                <ProtectedSaasRoute>
                  <SaasPortalSoftwareAccess />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/saas/portal/software"
              element={
                <ProtectedSaasRoute>
                  <SaasPortalSoftwareAccess />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/portal/support"
              element={
                <ProtectedSaasRoute>
                  <SaasPortalSupport />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/saas/portal/support"
              element={
                <ProtectedSaasRoute>
                  <SaasPortalSupport />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/portal/feedback"
              element={
                <ProtectedSaasRoute>
                  <SaasPortalFeedback />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/saas/portal/feedback"
              element={
                <ProtectedSaasRoute>
                  <SaasPortalFeedback />
                </ProtectedSaasRoute>
              }
            />

            {/* Platform Admin Control Plane Routes & Aliases */}
            <Route
              path="/admin"
              element={
                <ProtectedSaasRoute>
                  <SaasAdminDashboardPage />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/saas/admin"
              element={
                <ProtectedSaasRoute>
                  <SaasAdminDashboardPage />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/admin/customers"
              element={
                <ProtectedSaasRoute>
                  <SaasAdminCustomersPage />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/saas/admin/customers"
              element={
                <ProtectedSaasRoute>
                  <SaasAdminCustomersPage />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/admin/licenses"
              element={
                <ProtectedSaasRoute>
                  <SaasAdminLicensesPage />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/saas/admin/licenses"
              element={
                <ProtectedSaasRoute>
                  <SaasAdminLicensesPage />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/admin/payments"
              element={
                <ProtectedSaasRoute>
                  <SaasAdminPaymentsPage />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/saas/admin/payments"
              element={
                <ProtectedSaasRoute>
                  <SaasAdminPaymentsPage />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/admin/leads"
              element={
                <ProtectedSaasRoute>
                  <SaasAdminLeadsPage />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/saas/admin/leads"
              element={
                <ProtectedSaasRoute>
                  <SaasAdminLeadsPage />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/admin/enquiries"
              element={
                <ProtectedSaasRoute>
                  <SaasAdminEnquiriesPage />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/saas/admin/enquiries"
              element={
                <ProtectedSaasRoute>
                  <SaasAdminEnquiriesPage />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/admin/feedback"
              element={
                <ProtectedSaasRoute>
                  <SaasAdminFeedbackPage />
                </ProtectedSaasRoute>
              }
            />
            <Route
              path="/saas/admin/feedback"
              element={
                <ProtectedSaasRoute>
                  <SaasAdminFeedbackPage />
                </ProtectedSaasRoute>
              }
            />

            {/* Operational Tenant Login & Password Reset */}
            <Route path="/login" element={<SmartLoginRoute />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Root route with domain-aware landing */}
            <Route path="/" element={<SmartRootRoute />} />

            {/* Owner & Manager Operations Routes */}
            <Route
              path="/bookings"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <BookingsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/jobs"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <JobsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/customers"
              element={
                <ProtectedRoute permission="operations.view">
                  <AppLayout>
                    <CustomersPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/machines"
              element={
                <ProtectedRoute permission="operations.view">
                  <AppLayout>
                    <MachinesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/drivers"
              element={
                <ProtectedRoute permission="operations.view">
                  <AppLayout>
                    <DriversPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/employees"
              element={
                <ProtectedRoute permission="operations.view">
                  <AppLayout>
                    <EmployeesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/payments"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <PaymentsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/expenses"
              element={
                <ProtectedRoute permission="operations.view">
                  <AppLayout>
                    <ExpensesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/fuel"
              element={
                <ProtectedRoute permission="operations.view">
                  <AppLayout>
                    <FuelPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/maintenance"
              element={
                <ProtectedRoute permission="operations.view">
                  <AppLayout>
                    <MaintenancePage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports"
              element={
                <ProtectedRoute permission="report.generate">
                  <AppLayout>
                    <ReportsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SettingsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Driver Mobile Surface Routes (§11.9) */}
            <Route
              path="/driver"
              element={
                <ProtectedRoute>
                  <DriverLayout>
                    <DriverHomePage />
                  </DriverLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/driver/jobs"
              element={
                <ProtectedRoute>
                  <DriverLayout>
                    <DriverJobsPage />
                  </DriverLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/driver/jobs/:id"
              element={
                <ProtectedRoute>
                  <DriverLayout>
                    <DriverJobDetailPage />
                  </DriverLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/driver/profile"
              element={
                <ProtectedRoute>
                  <DriverLayout>
                    <DriverProfilePage />
                  </DriverLayout>
                </ProtectedRoute>
              }
            />

            {/* Farmer / Customer Portal Surface Routes (§11.10) */}
            <Route
              path="/portal"
              element={
                <ProtectedRoute>
                  <FarmerPortalLayout>
                    <FarmerHomePage />
                  </FarmerPortalLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/portal/bookings"
              element={
                <ProtectedRoute>
                  <FarmerPortalLayout>
                    <FarmerBookingsPage />
                  </FarmerPortalLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/portal/invoices"
              element={
                <ProtectedRoute>
                  <FarmerPortalLayout>
                    <FarmerInvoicesPage />
                  </FarmerPortalLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/portal/profile"
              element={
                <ProtectedRoute>
                  <FarmerPortalLayout>
                    <FarmerProfilePage />
                  </FarmerPortalLayout>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/saas" replace />} />
          </Routes>
        </AuthProvider>
      </SaasAuthProvider>
    </BrowserRouter>
  );
}
