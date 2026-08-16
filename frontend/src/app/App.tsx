import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { AppLayout } from "../layouts/AppLayout";
import { DriverLayout } from "../layouts/DriverLayout";
import { FarmerPortalLayout } from "../layouts/FarmerPortalLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { Spinner } from "../components/ui/Spinner";

// Operational Surface Pages
import { LoginPage } from "../features/auth/LoginPage";
import { AcceptInvitePage } from "../features/auth/AcceptInvitePage";
import { ResetPasswordPage } from "../features/auth/ResetPasswordPage";
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
import { TeamPage } from "../features/team/TeamPage";

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

// Phase 1 is single-product, single-tenant: the app root always goes
// straight to the operational login/dashboard. There is no separate
// marketing/commercial surface to branch into.
function RootRoute() {
  const { roleKey } = useAuth();
  if (roleKey === "driver") {
    return <Navigate to="/driver" replace />;
  }
  if (roleKey === "farmer") {
    return <Navigate to="/farmer" replace />;
  }
  return (
    <AppLayout>
      <DashboardPage />
    </AppLayout>
  );
}

function SmartRootRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="sa-center-viewport">
        <Spinner size="lg" label="Loading..." />
      </div>
    );
  }
  if (isAuthenticated) {
    return (
      <ProtectedRoute>
        <RootRoute />
      </ProtectedRoute>
    );
  }
  return <Navigate to="/login" replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Operational Login & Password Reset */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />

          {/* Root route */}
          <Route path="/" element={<SmartRootRoute />} />

          {/* Owner & Manager Operations Routes */}
          <Route
            path="/bookings"
            element={
              <ProtectedRoute permission="operations.view">
                <AppLayout>
                  <BookingsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/jobs"
            element={
              <ProtectedRoute permission="operations.view">
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
              <ProtectedRoute permission="operations.view">
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
              <ProtectedRoute permission="operations.view">
                <AppLayout>
                  <SettingsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/team"
            element={
              <ProtectedRoute permission="user.manage">
                <AppLayout>
                  <TeamPage />
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
            path="/farmer"
            element={
              <ProtectedRoute>
                <FarmerPortalLayout>
                  <FarmerHomePage />
                </FarmerPortalLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/farmer/bookings"
            element={
              <ProtectedRoute>
                <FarmerPortalLayout>
                  <FarmerBookingsPage />
                </FarmerPortalLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/farmer/invoices"
            element={
              <ProtectedRoute>
                <FarmerPortalLayout>
                  <FarmerInvoicesPage />
                </FarmerPortalLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/farmer/profile"
            element={
              <ProtectedRoute>
                <FarmerPortalLayout>
                  <FarmerProfilePage />
                </FarmerPortalLayout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
