import { lazy } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "@/features/auth/LoginPage";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { RequireAuth } from "./RequireAuth";

// Route-level code splitting keeps the initial bundle to the shell and login.
const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage"));
const PatientListPage = lazy(() => import("@/features/patients/PatientListPage"));
const PatientDetailLayout = lazy(() => import("@/features/patients/PatientDetailLayout"));
const PatientOverviewTab = lazy(() => import("@/features/patients/PatientOverviewTab"));
const PatientVisitsTab = lazy(() => import("@/features/patients/PatientVisitsTab"));
const PatientVitalsTab = lazy(() => import("@/features/patients/PatientVitalsTab"));
const PatientAttachmentsTab = lazy(() => import("@/features/patients/PatientAttachmentsTab"));
const VisitDetailPage = lazy(() => import("@/features/visits/VisitDetailPage"));
const CaptureLinkPage = lazy(() => import("@/features/attachments/CaptureLinkPage"));

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Tokenised, unauthenticated: opened by a phone from a QR code. */}
      <Route path="/capture/:token" element={<CaptureLinkPage />} />
      <Route element={<RequireAuth />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/patients" element={<PatientListPage />} />
        <Route path="/patients/:patientId" element={<PatientDetailLayout />}>
          <Route index element={<PatientOverviewTab />} />
          <Route path="visits" element={<PatientVisitsTab />} />
          <Route path="vitals" element={<PatientVitalsTab />} />
          <Route path="attachments" element={<PatientAttachmentsTab />} />
        </Route>
        <Route path="/visits/:visitId" element={<VisitDetailPage />} />
        <Route
          path="*"
          element={
            <EmptyState
              title="Page not found"
              help="The page you followed does not exist or has moved."
              action={
                <Button asChild>
                  <Link to="/dashboard">Back to dashboard</Link>
                </Button>
              }
            />
          }
        />
      </Route>
    </Routes>
  );
}
