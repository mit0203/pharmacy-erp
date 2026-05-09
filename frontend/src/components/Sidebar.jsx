import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Pill,
  Package,
  ShoppingCart,
  TrendingUp,
  BarChart2,
  BookOpen,
  Settings,
  LogOut,
  Users,
  Truck,
  Shield,
} from 'lucide-react';

export default function Sidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const userRoles = Array.isArray(user?.roles) ? user.roles.filter(Boolean) : [];
  const primaryRole = userRoles[0] || 'USER';

  const hasAnyRole = (allowedRoles = []) => {
    if (!Array.isArray(allowedRoles) || !allowedRoles.length) return false;
    return allowedRoles.some((role) => userRoles.includes(role));
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const NAV_ITEMS = [
    {
      to: '/dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
      roles: ['ADMIN', 'STORE_MANAGER'],
    },
    {
      to: '/medicines',
      icon: Pill,
      label: 'Medicines',
      roles: ['ADMIN', 'STORE_MANAGER', 'PHARMACIST'],
    },
    {
      to: '/batches',
      icon: Package,
      label: 'Batches',
      roles: ['ADMIN', 'STORE_MANAGER', 'PHARMACIST'],
    },
    {
      to: '/customers',
      icon: Users,
      label: 'Customers',
      roles: ['ADMIN', 'STORE_MANAGER', 'PHARMACIST'],
    },
    {
      to: '/suppliers',
      icon: Truck,
      label: 'Suppliers',
      roles: ['ADMIN', 'STORE_MANAGER'],
    },
    {
      to: '/purchases',
      icon: ShoppingCart,
      label: 'Purchases',
      roles: ['ADMIN', 'STORE_MANAGER'],
    },
    {
      to: '/sales',
      icon: TrendingUp,
      label: 'Sales',
      roles: ['ADMIN', 'STORE_MANAGER', 'PHARMACIST'],
    },
    {
      to: '/reports',
      icon: BarChart2,
      label: 'Reports',
      roles: ['ADMIN', 'STORE_MANAGER'],
    },
    {
      to: '/accounts',
      icon: BookOpen,
      label: 'Accounts',
      roles: ['ADMIN'],
    },
    {
      to: '/admin',
      icon: Shield,
      label: 'Admin Panel',
      roles: ['ADMIN'],
    },
  ];

  const BOTTOM_ITEMS = [
    {
      to: '/settings',
      icon: Settings,
      label: 'Settings',
      roles: ['ADMIN', 'STORE_MANAGER', 'PHARMACIST'],
    },
  ];

  const visibleNavItems = NAV_ITEMS.filter((item) => hasAnyRole(item.roles));
  const visibleBottomItems = BOTTOM_ITEMS.filter((item) => hasAnyRole(item.roles));

  const getRoleLabel = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrator';
      case 'STORE_MANAGER':
        return 'Store Manager';
      case 'PHARMACIST':
        return 'Pharmacist';
      default:
        return role || 'User';
    }
  };

  return (
    <aside
      className="sidebar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div className="sidebar-logo">
        <img
          src="/logo.png"
          alt="Sygnus Biotech"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <div className="sidebar-logo-text">
          <span className="brand">Sygnus Biotech</span>
          <span className="sub">Clinical Curator ERP</span>
        </div>
      </div>

      <div
        className="sidebar-user-card"
        style={{
          margin: '6px 0 14px 0',
          padding: '12px 14px',
          borderRadius: '14px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          className="sidebar-user-role"
          style={{
            fontSize: '12px',
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
          }}
        >
          Signed in as
        </div>

        <div
          className="sidebar-user-name"
          style={{
            fontSize: '14px',
            fontWeight: 700,
            lineHeight: 1.3,
            wordBreak: 'break-word',
          }}
        >
          {user?.username || user?.email || 'User'}
        </div>

        <div
          className="sidebar-user-role"
          style={{
            fontSize: '12px',
            marginTop: '4px',
            fontWeight: 600,
          }}
        >
          {getRoleLabel(primaryRole)}
        </div>
      </div>

      <nav
        className="sidebar-nav"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <div className="nav-section-label">Main Menu</div>

        {visibleNavItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon className="nav-icon" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div
        className="sidebar-bottom"
        style={{
          marginTop: 'auto',
          paddingTop: '14px',
        }}
      >
        {visibleBottomItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon className="nav-icon" />
            <span>{label}</span>
          </NavLink>
        ))}

        <button
          type="button"
          onClick={handleLogout}
          className="nav-item"
          style={{
            width: '100%',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <LogOut className="nav-icon" style={{ color: '#e63946' }} />
          <span style={{ color: '#e63946' }}>Logout</span>
        </button>
      </div>
    </aside>
  );
}