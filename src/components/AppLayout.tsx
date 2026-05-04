import { Outlet, Navigate } from 'react-router-dom';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import { useUser } from '../context/UserContext';

export default function AppLayout() {
  const { currentUser, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full gradient-primary animate-pulse" />
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  if (!currentUser.collectiveCode) return <Navigate to="/create-household" replace />;

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background text-foreground">
      <AppHeader />
      <main className="px-4 pb-28 pt-4 sm:px-5">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
