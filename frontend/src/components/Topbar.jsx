import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Settings,
  Search,
  ChevronDown,
  LogOut,
  User,
  X,
  LayoutDashboard,
  Pill,
  Package,
  ShoppingCart,
  FileText,
  Wallet,
  Plus,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SEARCH_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    sub: 'Open operational overview',
    path: '/dashboard',
    keywords: ['dashboard home overview summary stats'],
    icon: LayoutDashboard,
  },
  {
    id: 'medicines',
    label: 'Medicines',
    sub: 'Manage medicine inventory',
    path: '/medicines',
    keywords: ['medicine medicines drug drugs stock inventory pills'],
    icon: Pill,
  },
  {
    id: 'batches',
    label: 'Batches',
    sub: 'Track batches and expiry',
    path: '/batches',
    keywords: ['batch batches expiry expired near expiry lot supplier invoice'],
    icon: Package,
  },
  {
    id: 'purchases',
    label: 'Purchases',
    sub: 'Manage purchase orders',
    path: '/purchases',
    keywords: ['purchase purchases po vendor supplier buy'],
    icon: ShoppingCart,
  },
  {
    id: 'sales',
    label: 'Sales',
    sub: 'Open sales and billing',
    path: '/sales',
    keywords: ['sale sales billing invoice customer order'],
    icon: ShoppingCart,
  },
  {
    id: 'reports',
    label: 'Reports',
    sub: 'Profit, stock, sales reports',
    path: '/reports',
    keywords: ['reports report analytics profit stock summary export'],
    icon: FileText,
  },
  {
    id: 'accounts',
    label: 'Accounts',
    sub: 'Receivables, payables, ledger',
    path: '/accounts',
    keywords: ['accounts accounting ledger receivable payable finance'],
    icon: Wallet,
  },
  {
    id: 'settings',
    label: 'Settings',
    sub: 'App and account settings',
    path: '/settings',
    keywords: ['settings profile preferences account'],
    icon: Settings,
  },
  {
    id: 'create-sale',
    label: 'Create New Sale',
    sub: 'Go to sales page',
    path: '/sales',
    keywords: ['new sale create sale billing invoice'],
    icon: Plus,
  },
  {
    id: 'add-medicine',
    label: 'Add Medicine',
    sub: 'Go to medicines page',
    path: '/medicines',
    keywords: ['add medicine create medicine new medicine'],
    icon: Plus,
  },
  {
    id: 'add-batch',
    label: 'Add Batch',
    sub: 'Go to batches page',
    path: '/batches',
    keywords: ['add batch create batch new batch expiry stock batch'],
    icon: Plus,
  },
];

const NOTIFICATIONS = [
  {
    id: 'n1',
    title: 'Check batches nearing expiry',
    sub: 'Review expiring inventory',
    path: '/batches',
    tone: '#d97706',
  },
  {
    id: 'n2',
    title: 'Review low stock medicines',
    sub: 'Refill critical items',
    path: '/medicines',
    tone: '#dc2626',
  },
  {
    id: 'n3',
    title: 'Open reports dashboard',
    sub: 'See business summary',
    path: '/reports',
    tone: '#2d3a8c',
  },
];

export default function Topbar() {
  const { user, logout, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showSearchMenu, setShowSearchMenu] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const searchRef = useRef(null);
  const userMenuRef = useRef(null);
  const notifMenuRef = useRef(null);

  const initials = user?.username
    ? user.username
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'US';

  const displayName = user?.username || 'User';
  const displayRole = user?.roles?.length
    ? user.roles.join(', ').replaceAll('_', ' ')
    : 'No Role';

  const accessibleSearchItems = useMemo(() => {
    return SEARCH_ITEMS.filter((item) => {
      if (item.path === '/dashboard') {
        return hasAnyRole(['ADMIN', 'STORE_MANAGER']);
      }
      if (item.path === '/medicines' || item.path === '/batches' || item.path === '/sales' || item.path === '/settings') {
        return hasAnyRole(['ADMIN', 'STORE_MANAGER', 'PHARMACIST']);
      }
      if (item.path === '/purchases' || item.path === '/reports') {
        return hasAnyRole(['ADMIN', 'STORE_MANAGER']);
      }
      if (item.path === '/accounts') {
        return hasAnyRole(['ADMIN']);
      }
      return true;
    });
  }, [hasAnyRole]);

  const filteredSearchItems = useMemo(() => {
    const q = searchVal.trim().toLowerCase();
    if (!q) return accessibleSearchItems.slice(0, 6);

    return accessibleSearchItems
      .filter((item) => {
        const haystack = `${item.label} ${item.sub} ${item.keywords.join(' ')}`.toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 8);
  }, [searchVal, accessibleSearchItems]);

  const visibleNotifications = useMemo(() => {
    return NOTIFICATIONS.filter((item) => {
      if (item.path === '/reports') {
        return hasAnyRole(['ADMIN', 'STORE_MANAGER']);
      }
      return true;
    });
  }, [hasAnyRole]);

  const currentPageLabel = useMemo(() => {
    const item = SEARCH_ITEMS.find((entry) => entry.path === location.pathname);
    return item?.label || 'Workspace';
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target)) {
        setShowNotifMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowSearchMenu(false);
        setShowUserMenu(false);
        setShowNotifMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleSearchNavigate = (item) => {
    setSearchVal('');
    setShowSearchMenu(false);
    navigate(item.path);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();

    const q = searchVal.trim().toLowerCase();
    if (!q) return;

    const bestMatch = filteredSearchItems[0];
    if (bestMatch) {
      handleSearchNavigate(bestMatch);
      return;
    }

    if ((q.includes('batch') || q.includes('expiry') || q.includes('supplier')) && hasAnyRole(['ADMIN', 'STORE_MANAGER', 'PHARMACIST'])) {
      navigate('/batches');
    } else if ((q.includes('sale') || q.includes('bill') || q.includes('customer')) && hasAnyRole(['ADMIN', 'STORE_MANAGER', 'PHARMACIST'])) {
      navigate('/sales');
    } else if ((q.includes('report') || q.includes('profit')) && hasAnyRole(['ADMIN', 'STORE_MANAGER'])) {
      navigate('/reports');
    } else if ((q.includes('account') || q.includes('ledger') || q.includes('receivable')) && hasAnyRole(['ADMIN'])) {
      navigate('/accounts');
    } else {
      navigate(hasAnyRole(['ADMIN', 'STORE_MANAGER', 'PHARMACIST']) ? '/medicines' : '/login');
    }

    setSearchVal('');
    setShowSearchMenu(false);
  };

  return (
    <header className="topbar">
      <div
        className="topbar-left"
        ref={searchRef}
        style={{ minWidth: 0, flex: 1 }}
      >
        <form onSubmit={handleSearchSubmit} style={{ width: '100%' }}>
          <div
            className="search-bar topbar-search"
            style={{
              border: showSearchMenu ? '1.5px solid #c7d2fe' : undefined,
              boxShadow: showSearchMenu ? '0 8px 24px rgba(37, 99, 235, 0.08)' : undefined,
            }}
          >
            <Search size={15} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search pages, medicines, batches, reports..."
              value={searchVal}
              onChange={(e) => {
                setSearchVal(e.target.value);
                setShowSearchMenu(true);
              }}
              onFocus={() => setShowSearchMenu(true)}
            />
            {searchVal && (
              <button
                type="button"
                onClick={() => {
                  setSearchVal('');
                  setShowSearchMenu(true);
                }}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </form>

        {showSearchMenu && (
          <div className="topbar-search-dropdown">
            <div className="topbar-dropdown-head">QUICK NAVIGATION</div>

            {filteredSearchItems.length === 0 ? (
              <div style={{ padding: '16px 14px', fontSize: '13px', color: '#94a3b8' }}>
                No matching pages found.
              </div>
            ) : (
              filteredSearchItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSearchNavigate(item)}
                    className="topbar-search-item"
                  >
                    <div className="topbar-search-item-icon">
                      <Icon size={16} color="#2d3a8c" />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#1f2937',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: '#94a3b8',
                          marginTop: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.sub}
                      </div>
                    </div>
                    <ArrowUpRight size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
                  </button>
                );
              })
            )}

            <div className="topbar-search-footer">
              Current page: <strong>{currentPageLabel}</strong> · Press Enter to open best match
            </div>
          </div>
        )}
      </div>

      <div
        className="topbar-right"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexShrink: 0,
          minWidth: 0,
          marginLeft: '16px',
        }}
      >
        <div ref={notifMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => {
              setShowNotifMenu((prev) => !prev);
              setShowUserMenu(false);
            }}
            style={iconButtonStyle}
            title="Notifications"
          >
            <Bell size={20} />
            <span className="notif-dot" />
          </button>

          {showNotifMenu && (
            <div className="topbar-user-menu" style={dropdownStyle(300)}>
              <div style={dropdownHeaderStyle}>Notifications</div>

              {visibleNotifications.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setShowNotifMenu(false);
                    navigate(item.path);
                  }}
                  style={notifItemStyle}
                >
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: item.tone,
                      marginTop: '5px',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#1f2937',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: '11.5px',
                        color: '#94a3b8',
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.sub}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/settings')}
          style={{ ...iconButtonStyle, flexShrink: 0 }}
          title="Settings"
        >
          <Settings size={20} />
        </button>

        <div ref={userMenuRef} style={{ position: 'relative', minWidth: 0, flexShrink: 1 }}>
          <button
            onClick={() => {
              setShowUserMenu((prev) => !prev);
              setShowNotifMenu(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: '10px',
              transition: 'background 0.2s',
              width: '100%',
              maxWidth: '220px',
              minWidth: 0,
            }}
          >
            <div className="avatar" style={{ flexShrink: 0 }}>
              {initials}
            </div>

            <div style={{ textAlign: 'left', minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#1a202c',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={displayName}
              >
                {displayName}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#718096',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textTransform: 'capitalize',
                  marginTop: '2px',
                }}
                title={displayRole}
              >
                {displayRole}
              </div>
            </div>

            <ChevronDown size={14} color="#718096" style={{ flexShrink: 0 }} />
          </button>

          {showUserMenu && (
            <div className="topbar-user-menu" style={dropdownStyle(240)}>
              <div className="topbar-user-menu-header" style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <div
                  className="topbar-user-menu-name"
                  style={{
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={displayName}
                >
                  {displayName}
                </div>
                <div
                  className="topbar-user-menu-email"
                  style={{
                    fontSize: '12px',
                    marginTop: '3px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={user?.email || ''}
                >
                  {user?.email || 'user@example.com'}
                </div>
                <div
                  className="topbar-user-menu-role"
                  style={{
                    fontSize: '11px',
                    marginTop: '4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textTransform: 'capitalize',
                  }}
                  title={displayRole}
                >
                  {displayRole}
                </div>
              </div>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  navigate('/settings');
                }}
                style={menuBtnStyle}
              >
                <User size={15} /> Profile
              </button>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  navigate('/settings');
                }}
                style={menuBtnStyle}
              >
                <Settings size={15} /> Settings
              </button>

              <button
                onClick={handleLogout}
                style={{
                  ...menuBtnStyle,
                  color: '#e63946',
                }}
              >
                <LogOut size={15} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const iconButtonStyle = {
  position: 'relative',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '6px',
  borderRadius: '8px',
  color: '#718096',
};

const menuBtnStyle = {
  width: '100%',
  padding: '11px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontSize: '13px',
  color: '#2d3748',
  transition: 'background 0.2s',
};

const notifItemStyle = {
  width: '100%',
  padding: '12px 16px',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '10px',
  borderBottom: '1px solid #f8fafc',
};

const dropdownStyle = (minWidth) => ({
  position: 'absolute',
  right: 0,
  top: '46px',
  background: '#ffffff',
  borderRadius: '14px',
  boxShadow: '0 16px 40px rgba(15, 23, 42, 0.12)',
  border: '1px solid #e8ecf4',
  minWidth,
  maxWidth: '280px',
  zIndex: 100,
  overflow: 'hidden',
});

const dropdownHeaderStyle = {
  padding: '14px 16px',
  borderBottom: '1px solid #f1f5f9',
  fontSize: '13px',
  fontWeight: 800,
  color: '#1f2937',
};

const dropdownHeaderBlockStyle = {
  padding: '14px 16px',
  borderBottom: '1px solid #f1f5f9',
};