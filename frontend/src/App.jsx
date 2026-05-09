import { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import MedicinePage from './pages/MedicinePage';
import BatchesPage from './pages/BatchesPage';
import PurchasesPage from './pages/PurchasesPage';
import SalesPage from './pages/SalesPage';
import ReportsPage from './pages/ReportsPage';
import AccountsPage from './pages/AccountsPage';
import SettingsPage from './pages/SettingsPage';
import CustomersPage from './pages/CustomersPage';
import SuppliersPage from './pages/SuppliersPage';
import AdminPage from './pages/AdminPage';

function getDefaultRouteForUser(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];

  if (roles.includes('ADMIN') || roles.includes('STORE_MANAGER')) {
    return '/dashboard';
  }

  if (roles.includes('PHARMACIST')) {
    return '/medicines';
  }

  return '/login';
}

function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Layout />;
}

function RoleRoute({ allowedRoles = [] }) {
  const { user, isAuthenticated, hasAnyRole } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAnyRole(allowedRoles)) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }

  return <Outlet />;
}

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }

  return children;
}

function RootRedirect() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }

  return <Navigate to="/login" replace />;
}

function NotFoundRedirect() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }

  return <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnlyRoute>
            <ForgotPasswordPage />
          </PublicOnlyRoute>
        }
      />

      <Route element={<ProtectedLayout />}>
        <Route element={<RoleRoute allowedRoles={['ADMIN', 'STORE_MANAGER']} />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>

        <Route
          element={
            <RoleRoute
              allowedRoles={['ADMIN', 'STORE_MANAGER', 'PHARMACIST']}
            />
          }
        >
          <Route path="/medicines" element={<MedicinePage />} />
          <Route path="/batches" element={<BatchesPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<NotFoundRedirect />} />
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      const theme = localStorage.getItem('pharmacy_theme') || 'system';
      if (theme === 'system') {
        if (e.matches) {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}