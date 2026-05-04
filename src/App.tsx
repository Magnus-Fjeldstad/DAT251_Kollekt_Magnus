import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext';
import AppLayout from './components/AppLayout';

const LoginPage           = lazy(() => import('./pages/LoginPage'));
const CreateHouseholdPage = lazy(() => import('./pages/CreateHouseholdPage'));
const DashboardPage       = lazy(() => import('./pages/DashboardPage'));
const TasksPage           = lazy(() => import('./pages/TasksPage'));
const CalendarPage        = lazy(() => import('./pages/CalendarPage'));
const ChatPage            = lazy(() => import('./pages/ChatPage'));
const EconomyPage         = lazy(() => import('./pages/EconomyPage'));
const PantTrackerPage     = lazy(() => import('./pages/PantTrackerPage'));
const LeaderboardPage     = lazy(() => import('./pages/LeaderboardPage'));
const GamesPage           = lazy(() => import('./pages/GamesPage'));
const CollektGamePage     = lazy(() => import('./pages/CollektGamePage'));
const ProfilePage         = lazy(() => import('./pages/ProfilePage'));
const MorePage            = lazy(() => import('./pages/MorePage'));

// Guard for auth-only pages that don't need a collective (create-household)
function AuthOnlyRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useUser();
  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-8 w-8 rounded-full gradient-primary animate-pulse" />
    </div>
  );
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Guard for login page: redirect already-authed users
function GuestOnlyRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useUser();
  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-8 w-8 rounded-full gradient-primary animate-pulse" />
    </div>
  );
  if (currentUser) {
    return <Navigate to={currentUser.collectiveCode ? '/' : '/create-household'} replace />;
  }
  return <>{children}</>;
}

const PageFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="h-8 w-8 rounded-full gradient-primary animate-pulse" />
  </div>
);

function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<GuestOnlyRoute><LoginPage /></GuestOnlyRoute>} />
        <Route
          path="/create-household"
          element={<AuthOnlyRoute><CreateHouseholdPage /></AuthOnlyRoute>}
        />
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/economy" element={<EconomyPage />} />
          <Route path="/economy/pant" element={<PantTrackerPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/games/kollekt" element={<CollektGamePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/more" element={<MorePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <AppRoutes />
      </UserProvider>
    </BrowserRouter>
  );
}
