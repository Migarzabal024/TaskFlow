import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Spinner from "./components/Spinner";
import { RequireFamily, RequireGuest, RequireLeader, RequireOnboarding } from "./app/RouteGuards";
import AppLayout from "./layouts/AppLayout";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CreateFamilyPage from "./pages/onboarding/CreateFamilyPage";
import InvitationPage from "./pages/onboarding/InvitationPage";
import DashboardPage from "./pages/DashboardPage";
import TasksListPage from "./pages/TasksListPage";
import TaskCreatePage from "./pages/TaskCreatePage";
import TaskDetailPage from "./pages/TaskDetailPage";
import TaskEditPage from "./pages/TaskEditPage";
import FamilyPage from "./pages/FamilyPage";
import FamilyMembersPage from "./pages/FamilyMembersPage";
import FamilyInvitePage from "./pages/FamilyInvitePage";
import NotificationsPage from "./pages/NotificationsPage";
import StatisticsPage from "./pages/StatisticsPage";
import ProfilePage from "./pages/ProfilePage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return <Spinner label="Cargando FamilyTask..." />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route element={<RequireGuest />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireOnboarding />}>
        <Route path="/onboarding/create-family" element={<CreateFamilyPage />} />
        <Route path="/onboarding/invitation" element={<InvitationPage />} />
      </Route>

      <Route element={<RequireFamily />}>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="tasks" element={<TasksListPage />} />
          <Route element={<RequireLeader />}>
            <Route path="tasks/new" element={<TaskCreatePage />} />
          </Route>
          <Route path="tasks/:id" element={<TaskDetailPage />} />
          <Route element={<RequireLeader />}>
            <Route path="tasks/:id/edit" element={<TaskEditPage />} />
          </Route>
          <Route path="family" element={<FamilyPage />} />
          <Route path="family/members" element={<FamilyMembersPage />} />
          <Route element={<RequireLeader />}>
            <Route path="family/invite" element={<FamilyInvitePage />} />
          </Route>
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
