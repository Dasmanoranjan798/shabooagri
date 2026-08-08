import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { AppLayout } from "../layouts/AppLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { LoginPage } from "../features/auth/LoginPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { BookingsPage } from "../features/bookings/BookingsPage";
import { JobsPage } from "../features/jobs/JobsPage";
import { PlaceholderPage } from "../features/placeholder/PlaceholderPage";
import { getTerm } from "../lib/terminology";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <DashboardPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

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
                  <PlaceholderPage
                    title={getTerm("customer", true)}
                    icon="👥"
                    description={`Customer profiles, village linkage, and ${getTerm("booking").toLowerCase()} history.`}
                  />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/machines"
            element={
              <ProtectedRoute permission="operations.view">
                <AppLayout>
                  <PlaceholderPage
                    title={getTerm("machine", true)}
                    icon="🚚"
                    description={`Equipment fleet records, hour meters, fuel types, and availability.`}
                  />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/drivers"
            element={
              <ProtectedRoute permission="operations.view">
                <AppLayout>
                  <PlaceholderPage
                    title={getTerm("driver", true)}
                    icon="👨‍🌾"
                    description={`Operator licenses, employee records, and machine assignments.`}
                  />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/employees"
            element={
              <ProtectedRoute permission="operations.view">
                <AppLayout>
                  <PlaceholderPage
                    title="Employees"
                    icon="👔"
                    description="Company staff directory and login access linkage."
                  />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/payments"
            element={
              <ProtectedRoute permission="payment.receive">
                <AppLayout>
                  <PlaceholderPage
                    title="Payments & Invoices"
                    icon="💳"
                    description={`Invoicing, receipt generation, and payment collection.`}
                  />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/expenses"
            element={
              <ProtectedRoute permission="operations.view">
                <AppLayout>
                  <PlaceholderPage
                    title="Expenses"
                    icon="💸"
                    description="Operational expenditure tracking."
                  />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/fuel"
            element={
              <ProtectedRoute permission="operations.view">
                <AppLayout>
                  <PlaceholderPage
                    title="Fuel Tracking"
                    icon="⛽"
                    description="Equipment refueling logs and consumption metrics."
                  />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/maintenance"
            element={
              <ProtectedRoute permission="operations.view">
                <AppLayout>
                  <PlaceholderPage
                    title="Maintenance"
                    icon="🔧"
                    description="Service schedules, countdowns, and maintenance records."
                  />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute permission="report.generate">
                <AppLayout>
                  <PlaceholderPage
                    title="Reports"
                    icon="📈"
                    description="Financial summaries, machine utilization, and operational reports."
                  />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute permission="settings.manage">
                <AppLayout>
                  <PlaceholderPage
                    title="Settings"
                    icon="⚙️"
                    description="Company configuration, branding, and terminology settings."
                  />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
