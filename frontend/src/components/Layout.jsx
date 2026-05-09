import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div>
      <Sidebar />
      <div className="main-layout">
        <Topbar />
        <main className="page-content animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
