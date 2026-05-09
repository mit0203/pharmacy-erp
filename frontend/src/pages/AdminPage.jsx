import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Shield,
  Users,
  Activity,
  RefreshCw,
  Search,
  UserCog,
  BadgeCheck,
  Ban,
  CheckCircle2,
  XCircle,
  Clock3,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  ArrowUpDown,
  UserRoundCheck,
  UserRoundX,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function formatRole(role) {
  if (!role) return '-';
  return String(role)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatCard({ icon: Icon, title, value, sub, color = '#4f46e5' }) {
  return (
    <div
      className="card"
      style={{
        padding: '20px',
        borderRadius: '24px',
        border: '1px solid var(--border, #e2e8f0)',
        boxShadow: 'var(--shadow-soft, 0 10px 30px rgba(15,23,42,0.06))',
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: 'var(--text-muted, var(--text-muted, #64748b))',
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: '8px',
              fontSize: '26px',
              fontWeight: 900,
              color: 'var(--text, var(--text-main, #0f172a))',
              lineHeight: 1.2,
            }}
          >
            {value}
          </div>
          {sub ? (
            <div
              style={{
                marginTop: '7px',
                fontSize: '12px',
                color: 'var(--text-muted, var(--text-muted, #64748b))',
                lineHeight: 1.5,
              }}
            >
              {sub}
            </div>
          ) : null}
        </div>

        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '16px',
            background: `${color}12`,
            border: `1px solid ${color}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={20} color={color} />
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }) {
  const map = {
    ADMIN: { bg: '#ede9fe', color: '#6d28d9' },
    STORE_MANAGER: { bg: '#dbeafe', color: '#1d4ed8' },
    PHARMACIST: { bg: '#dcfce7', color: '#166534' },

  };

  const style = map[role] || { bg: '#e2e8f0', color: 'var(--text-muted, #334155)' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '7px 12px',
        borderRadius: '999px',
        background: style.bg,
        color: style.color,
        fontSize: '11px',
        fontWeight: 800,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        maxWidth: '100%',
      }}
      title={role}
    >
      {formatRole(role)}
    </span>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        justifyContent: 'center',
        padding: '7px 12px',
        borderRadius: '999px',
        background: active ? '#dcfce7' : '#fee2e2',
        color: active ? '#166534' : '#991b1b',
        fontSize: '11px',
        fontWeight: 800,
        whiteSpace: 'nowrap',
      }}
    >
      {active ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      {active ? 'Active' : 'Disabled'}
    </span>
  );
}

function SectionCard({ title, subtitle, children, icon: Icon }) {
  return (
    <div
      className="card"
      style={{
        padding: '22px',
        borderRadius: '26px',
        border: '1px solid var(--border, #e2e8f0)',
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '18px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', minWidth: 0 }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '16px',
              background: 'rgba(79,70,229,0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(79,70,229,0.14)',
              flexShrink: 0,
            }}
          >
            <Icon size={20} color="#4f46e5" />
          </div>
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 800,
                color: 'var(--text, var(--text-main, #0f172a))',
              }}
            >
              {title}
            </h2>
            <div
              style={{
                marginTop: '4px',
                fontSize: '12px',
                color: 'var(--text-muted, var(--text-muted, #64748b))',
              }}
            >
              {subtitle}
            </div>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}

function ConfirmModal({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, loading]);

  if (!mounted || !open) return null;

  return createPortal(
    <div onClick={!loading ? onClose : undefined} style={overlayStyle}>
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          borderRadius: '26px',
          overflow: 'hidden',
          boxShadow: '0 30px 70px rgba(15, 23, 42, 0.32)',
        }}
      >
        <div style={{ padding: '22px 22px 10px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              background: danger ? 'var(--bg-card, #ffffff)1f2' : '#eef2ff',
              border: `1px solid ${danger ? '#fecdd3' : '#c7d2fe'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertTriangle size={20} color={danger ? '#be123c' : '#4f46e5'} />
          </div>

          <h3
            style={{
              marginTop: '14px',
              marginBottom: '8px',
              fontSize: '20px',
              fontWeight: 900,
              color: 'var(--text-main, #0f172a)',
            }}
          >
            {title}
          </h3>

          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: 'var(--text-muted, #64748b)',
              lineHeight: 1.7,
            }}
          >
            {message}
          </p>
        </div>

        <div
          style={{
            padding: '18px 22px 22px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            disabled={loading}
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={loading}
            onClick={onConfirm}
            style={
              danger
                ? { background: '#dc2626', borderColor: '#dc2626' }
                : undefined
            }
          >
            {loading ? 'Please wait...' : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function UserDetailsModal({ user, onClose }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [user, onClose]);

  if (!mounted || !user) return null;

  const primaryRole =
    Array.isArray(user.roles) && user.roles.length ? user.roles[0] : 'PHARMACIST';

  return createPortal(
    <div onClick={onClose} style={overlayStyle}>
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '720px',
          borderRadius: '30px',
          border: '1px solid var(--border, #e2e8f0)',
          boxShadow: '0 30px 70px rgba(15, 23, 42, 0.32)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '22px 24px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px',
            alignItems: 'flex-start',
            borderBottom: '1px solid var(--border, #e2e8f0)',
            background:
              'linear-gradient(135deg, rgba(79,70,229,0.06) 0%, rgba(59,130,246,0.04) 100%)',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 900,
                color: 'var(--text, var(--text-main, #0f172a))',
                lineHeight: 1.2,
              }}
            >
              User Details
            </div>
            <div
              style={{
                marginTop: '6px',
                fontSize: '13px',
                color: 'var(--text-muted, var(--text-muted, #64748b))',
              }}
            >
              View account, role and access information
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '14px',
              border: '1px solid var(--border, #e2e8f0)',
              background: 'var(--bg-soft, var(--bg-card-soft, #f8fafc))',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted, var(--text-muted, #64748b))',
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
            }}
          >
            <div style={infoBoxStyle}>
              <div style={infoLabelStyle}>Username</div>
              <div style={infoValueStyle}>{user.username || '-'}</div>
            </div>

            <div style={infoBoxStyle}>
              <div style={infoLabelStyle}>Email</div>
              <div style={{ ...infoValueStyle, wordBreak: 'break-word' }}>
                {user.email || '-'}
              </div>
            </div>

            <div style={infoBoxStyle}>
              <div style={infoLabelStyle}>Role</div>
              <div style={{ marginTop: '10px' }}>
                <RoleBadge role={primaryRole} />
              </div>
            </div>

            <div style={infoBoxStyle}>
              <div style={infoLabelStyle}>Status</div>
              <div style={{ marginTop: '10px' }}>
                <StatusBadge active={user.active !== false} />
              </div>
            </div>

            <div style={infoBoxStyle}>
              <div style={infoLabelStyle}>Created At</div>
              <div style={infoValueStyle}>
                {user.createdAt ? new Date(user.createdAt).toLocaleString() : 'Not available'}
              </div>
            </div>

            <div style={infoBoxStyle}>
              <div style={infoLabelStyle}>Updated At</div>
              <div style={infoValueStyle}>
                {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : 'Not available'}
              </div>
            </div>

            <div style={infoBoxStyle}>
              <div style={infoLabelStyle}>Last Login</div>
              <div style={infoValueStyle}>
                {user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleString()
                  : 'Not available'}
              </div>
            </div>

            <div style={infoBoxStyle}>
              <div style={infoLabelStyle}>User ID</div>
              <div style={{ ...infoValueStyle, wordBreak: 'break-word' }}>
                {user.id || '-'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function AdminPage() {
  const { user, hasAnyRole } = useAuth();
  const canAccess = hasAnyRole(['ADMIN']);

  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('created_desc');

  const [toast, setToast] = useState(null);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [selectedIds, setSelectedIds] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const parseError = (err, fallback) =>
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback;

  const getPrimaryRole = (item) =>
    Array.isArray(item.roles) && item.roles.length ? item.roles[0] : 'PHARMACIST';

  const getAdminUsers = (list = users) =>
    list.filter((u) => Array.isArray(u.roles) && u.roles.includes('ADMIN'));

  const getActiveAdminCount = (list = users) =>
    getAdminUsers(list).filter((u) => u.active !== false).length;

  const isCurrentUser = (item) =>
    user?.id && item?.id ? String(user.id) === String(item.id) : false;

  const canChangeRoleSafely = (item, nextRole) => {
    const currentRole = getPrimaryRole(item);
    if (isCurrentUser(item)) {
      return { ok: false, reason: 'You cannot change your own role here.' };
    }

    if (currentRole === 'ADMIN' && nextRole !== 'ADMIN') {
      const activeAdminCount = getActiveAdminCount();
      if (item.active !== false && activeAdminCount <= 1) {
        return { ok: false, reason: 'Cannot change role of the last active admin.' };
      }
    }

    return { ok: true };
  };

  const canToggleStatusSafely = (item, nextActive) => {
    if (isCurrentUser(item)) {
      return { ok: false, reason: 'You cannot disable your own account here.' };
    }

    const currentRole = getPrimaryRole(item);
    if (currentRole === 'ADMIN' && nextActive === false) {
      const activeAdminCount = getActiveAdminCount();
      if (item.active !== false && activeAdminCount <= 1) {
        return { ok: false, reason: 'Cannot disable the last active admin.' };
      }
    }

    return { ok: true };
  };

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await api.get('/api/admin/users');
      setUsers(response?.data?.data || []);
    } catch (err) {
      console.error(err);
      setError(parseError(err, 'Failed to load admin users.'));
    } finally {
      setUsersLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const response = await api.get('/api/admin/audit-logs');
      setAuditLogs(response?.data?.data || []);
    } catch (err) {
      console.error(err);
      setError(parseError(err, 'Failed to load audit activity.'));
    } finally {
      setAuditLoading(false);
    }
  };

  const loadPage = async () => {
    if (!canAccess) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    await Promise.all([loadUsers(), loadAuditLogs()]);
    setLoading(false);
  };

  useEffect(() => {
    loadPage();
  }, [canAccess]);

  const filteredUsers = useMemo(() => {
    let list = users.filter((item) => {
      const searchText = search.trim().toLowerCase();
      const matchesSearch =
        !searchText ||
        String(item.username || '').toLowerCase().includes(searchText) ||
        String(item.email || '').toLowerCase().includes(searchText);

      const matchesRole =
        roleFilter === 'ALL' ||
        (Array.isArray(item.roles) && item.roles.includes(roleFilter));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && item.active !== false) ||
        (statusFilter === 'DISABLED' && item.active === false);

      return matchesSearch && matchesRole && matchesStatus;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'name_asc') {
        return String(a.username || '').localeCompare(String(b.username || ''));
      }
      if (sortBy === 'name_desc') {
        return String(b.username || '').localeCompare(String(a.username || ''));
      }
      if (sortBy === 'role_asc') {
        return String(getPrimaryRole(a)).localeCompare(String(getPrimaryRole(b)));
      }
      if (sortBy === 'status_asc') {
        return Number(b.active !== false) - Number(a.active !== false);
      }
      if (sortBy === 'created_asc') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return list;
  }, [users, search, roleFilter, statusFilter, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter, sortBy, users.length]);

  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((id) => filteredUsers.some((u) => String(u.id) === String(id)))
    );
  }, [filteredUsers]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage]);

  const pageIds = useMemo(() => paginatedUsers.map((u) => String(u.id)), [paginatedUsers]);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.active !== false).length;
    const disabledUsers = users.filter((u) => u.active === false).length;
    const admins = users.filter((u) => Array.isArray(u.roles) && u.roles.includes('ADMIN')).length;
    const managers = users.filter((u) => Array.isArray(u.roles) && u.roles.includes('STORE_MANAGER')).length;

    return { totalUsers, activeUsers, disabledUsers, admins, managers };
  }, [users]);

  const openConfirm = (config) => setPendingAction(config);
  const closeConfirm = () => {
    if (pendingAction?.loading) return;
    setPendingAction(null);
  };

  const updateUserRole = async (userId, nextRole) => {
    const targetUser = users.find((u) => String(u.id) === String(userId));
    if (!targetUser) return;

    const safety = canChangeRoleSafely(targetUser, nextRole);
    if (!safety.ok) {
      setToast({ type: 'error', message: safety.reason });
      return;
    }

    openConfirm({
      type: 'role',
      title: 'Change user role?',
      message: `Are you sure you want to change ${targetUser.username}'s role from ${formatRole(getPrimaryRole(targetUser))} to ${formatRole(nextRole)}?`,
      confirmText: 'Change Role',
      danger: false,
      loading: false,
      onConfirm: async () => {
        try {
          setPendingAction((prev) => ({ ...prev, loading: true }));
          setSavingUserId(userId);
          await api.put(`/api/admin/users/${userId}/role`, { role: nextRole });
          setUsers((prev) =>
            prev.map((u) => (String(u.id) === String(userId) ? { ...u, roles: [nextRole] } : u))
          );
          setToast({ type: 'success', message: 'User role updated successfully.' });
          setPendingAction(null);
        } catch (err) {
          console.error(err);
          setToast({ type: 'error', message: parseError(err, 'Failed to update role.') });
          setPendingAction(null);
        } finally {
          setSavingUserId('');
        }
      },
    });
  };

  const toggleUserStatus = async (userId, active) => {
    const targetUser = users.find((u) => String(u.id) === String(userId));
    if (!targetUser) return;

    const safety = canToggleStatusSafely(targetUser, active);
    if (!safety.ok) {
      setToast({ type: 'error', message: safety.reason });
      return;
    }

    openConfirm({
      type: 'status',
      title: active ? 'Activate user?' : 'Disable user?',
      message: active
        ? `Are you sure you want to activate ${targetUser.username}?`
        : `Are you sure you want to disable ${targetUser.username}?`,
      confirmText: active ? 'Activate' : 'Disable',
      danger: !active,
      loading: false,
      onConfirm: async () => {
        try {
          setPendingAction((prev) => ({ ...prev, loading: true }));
          setSavingUserId(userId);
          await api.put(`/api/admin/users/${userId}/status`, { active });
          setUsers((prev) =>
            prev.map((u) => (String(u.id) === String(userId) ? { ...u, active } : u))
          );
          setToast({
            type: 'success',
            message: active ? 'User activated successfully.' : 'User disabled successfully.',
          });
          setPendingAction(null);
        } catch (err) {
          console.error(err);
          setToast({ type: 'error', message: parseError(err, 'Failed to update user status.') });
          setPendingAction(null);
        } finally {
          setSavingUserId('');
        }
      },
    });
  };

  const toggleSelectAllPage = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectUser = (id) => {
    setSelectedIds((prev) =>
      prev.includes(String(id))
        ? prev.filter((x) => x !== String(id))
        : [...prev, String(id)]
    );
  };

  const handleBulkStatusChange = async (nextActive) => {
    const selectedUsers = users.filter((u) => selectedIds.includes(String(u.id)));

    if (!selectedUsers.length) {
      setToast({ type: 'error', message: 'Select at least one user first.' });
      return;
    }

    for (const item of selectedUsers) {
      const safety = canToggleStatusSafely(item, nextActive);
      if (!safety.ok) {
        setToast({ type: 'error', message: safety.reason });
        return;
      }
    }

    openConfirm({
      type: 'bulk-status',
      title: nextActive ? 'Activate selected users?' : 'Disable selected users?',
      message: `${selectedUsers.length} selected user(s) will be ${nextActive ? 'activated' : 'disabled'}.`,
      confirmText: nextActive ? 'Activate All' : 'Disable All',
      danger: !nextActive,
      loading: false,
      onConfirm: async () => {
        try {
          setPendingAction((prev) => ({ ...prev, loading: true }));
          setBulkLoading(true);

          await Promise.all(
            selectedUsers.map((item) =>
              api.put(`/api/admin/users/${item.id}/status`, { active: nextActive })
            )
          );

          setUsers((prev) =>
            prev.map((u) =>
              selectedIds.includes(String(u.id)) ? { ...u, active: nextActive } : u
            )
          );

          setToast({
            type: 'success',
            message: nextActive
              ? 'Selected users activated successfully.'
              : 'Selected users disabled successfully.',
          });
          setSelectedIds([]);
          setPendingAction(null);
        } catch (err) {
          console.error(err);
          setToast({
            type: 'error',
            message: parseError(err, 'Failed to update selected users.'),
          });
          setPendingAction(null);
        } finally {
          setBulkLoading(false);
        }
      },
    });
  };

  if (!canAccess) {
    return (
      <div
        className="card"
        style={{
          padding: '30px',
          borderRadius: '26px',
          textAlign: 'center',
        }}
      >
        <Shield size={44} color="#dc2626" />
        <h2
          style={{
            marginTop: '12px',
            marginBottom: '6px',
            fontSize: '22px',
            fontWeight: 800,
            color: 'var(--text, var(--text-main, #0f172a))',
          }}
        >
          Access Denied
        </h2>
        <p
          style={{
            margin: 0,
            color: 'var(--text-muted, var(--text-muted, #64748b))',
            fontSize: '14px',
            lineHeight: 1.6,
          }}
        >
          You are not eligible to access the admin panel.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        paddingBottom: '16px',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
      }}
    >
      <UserDetailsModal user={selectedUser} onClose={() => setSelectedUser(null)} />

      <ConfirmModal
        open={!!pendingAction}
        title={pendingAction?.title || ''}
        message={pendingAction?.message || ''}
        confirmText={pendingAction?.confirmText || 'Confirm'}
        danger={pendingAction?.danger}
        loading={pendingAction?.loading}
        onConfirm={pendingAction?.onConfirm || (() => {})}
        onClose={closeConfirm}
      />

      <div
        style={{
          marginBottom: '24px',
          padding: '24px',
          borderRadius: '30px',
          background:
            'linear-gradient(135deg, rgba(79,70,229,0.08) 0%, rgba(59,130,246,0.06) 55%, rgba(16,185,129,0.05) 100%)',
          border: '1px solid var(--border, #e2e8f0)',
          boxShadow: 'var(--shadow-soft, 0 10px 30px rgba(15,23,42,0.06))',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '16px',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '30px',
                fontWeight: '900',
                color: 'var(--text, var(--text-main, #0f172a))',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                margin: 0,
              }}
            >
              <Shield size={30} color="#4f46e5" /> Admin Panel
            </h1>
            <p
              style={{
                marginTop: '8px',
                fontSize: '14px',
                color: 'var(--text-muted, var(--text-muted, #64748b))',
                lineHeight: 1.7,
                maxWidth: '760px',
              }}
            >
              Manage users, roles, account access and audit activity from one secure administration panel.
            </p>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={loadPage}
            disabled={loading}
          >
            <RefreshCw size={16} /> {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {toast ? (
        <div
          style={{
            marginBottom: '16px',
            padding: '14px 16px',
            borderRadius: '18px',
            background: toast.type === 'error' ? 'var(--bg-card, #ffffff)1f2' : '#f0fdf4',
            color: toast.type === 'error' ? '#be123c' : '#166534',
            border: `1px solid ${toast.type === 'error' ? '#fecdd3' : '#bbf7d0'}`,
            fontSize: '13px',
            fontWeight: 800,
          }}
        >
          {toast.message}
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            marginBottom: '16px',
            padding: '14px 16px',
            borderRadius: '18px',
            background: 'var(--bg-card, #ffffff)7ed',
            color: '#9a3412',
            border: '1px solid #fed7aa',
            fontSize: '13px',
            fontWeight: 800,
            display: 'flex',
            justifyContent: 'space-between',
            gap: '10px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span>{error}</span>
          <button type="button" className="btn-secondary" onClick={loadPage}>
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '18px',
        }}
      >
        <StatCard
          icon={Users}
          title="Total Users"
          value={stats.totalUsers}
          sub="All registered accounts"
          color="#4f46e5"
        />
        <StatCard
          icon={BadgeCheck}
          title="Active Users"
          value={stats.activeUsers}
          sub="Users with system access"
          color="#16a34a"
        />
        <StatCard
          icon={UserRoundX}
          title="Disabled Users"
          value={stats.disabledUsers}
          sub="Accounts currently blocked"
          color="#dc2626"
        />
        <StatCard
          icon={Shield}
          title="Admins"
          value={stats.admins}
          sub="Users with full control"
          color="#7c3aed"
        />
        <StatCard
          icon={UserCog}
          title="Store Managers"
          value={stats.managers}
          sub="Operational supervisors"
          color="#0ea5e9"
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.35fr) minmax(280px, 0.65fr)',
          gap: '18px',
          alignItems: 'start',
        }}
      >
        <SectionCard
          icon={Users}
          title="User Management"
          subtitle="Search users, update roles, view details, and enable or disable access"
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(220px,1fr) minmax(160px,180px) minmax(160px,180px) minmax(160px,180px)',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <div style={{ position: 'relative', minWidth: 0 }}>
              <Search
                size={16}
                color="var(--text-soft, #94a3b8)"
                style={{ position: 'absolute', left: '14px', top: '16px' }}
              />
              <input
                className="input-field"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by username or email"
                style={{
                  width: '100%',
                  height: '48px',
                  borderRadius: '16px',
                  paddingLeft: '42px',
                }}
              />
            </div>

            <select
              className="input-field"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                height: '48px',
                borderRadius: '16px',
                minWidth: 0,
                width: '100%',
              }}
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="STORE_MANAGER">Store Manager</option>
              <option value="PHARMACIST">Pharmacist</option>

            </select>

            <select
              className="input-field"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                height: '48px',
                borderRadius: '16px',
                minWidth: 0,
                width: '100%',
              }}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
            </select>

            <select
              className="input-field"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                height: '48px',
                borderRadius: '16px',
                minWidth: 0,
                width: '100%',
              }}
            >
              <option value="created_desc">Newest First</option>
              <option value="created_asc">Oldest First</option>
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
              <option value="role_asc">Role</option>
              <option value="status_asc">Status</option>
            </select>
          </div>

          <div
            style={{
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted, #64748b)',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <UserRoundCheck size={14} />
              {selectedIds.length} selected
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={!selectedIds.length || bulkLoading}
                onClick={() => handleBulkStatusChange(true)}
                style={{ color: '#166534' }}
              >
                <CheckCircle2 size={14} /> Activate Selected
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={!selectedIds.length || bulkLoading}
                onClick={() => handleBulkStatusChange(false)}
                style={{ color: '#991b1b' }}
              >
                <Ban size={14} /> Disable Selected
              </button>
            </div>
          </div>

          <div
            style={{
              width: '100%',
              maxWidth: '100%',
              overflowX: 'auto',
              overflowY: 'hidden',
              border: '1px solid var(--border, #e2e8f0)',
              borderRadius: '22px',
            }}
          >
            <table
              style={{
                width: '100%',
                minWidth: '1180px',
                borderCollapse: 'collapse',
                tableLayout: 'fixed',
              }}
            >
              <thead>
                <tr style={{ background: 'var(--table-header, var(--bg-card-soft, #f8fafc))' }}>
                  <th style={{ ...thStyle, width: '54px' }}>
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleSelectAllPage}
                    />
                  </th>
                  <th style={{ ...thStyle, width: '120px' }}>
                    <span style={headFlexStyle}>
                      User <ArrowUpDown size={13} />
                    </span>
                  </th>
                  <th style={{ ...thStyle, width: '220px' }}>Email</th>
                  <th style={{ ...thStyle, width: '150px' }}>Role</th>
                  <th style={{ ...thStyle, width: '120px' }}>Status</th>
                  <th style={{ ...thStyle, width: '160px' }}>Last Login</th>
                  <th style={{ ...thStyle, width: '110px' }}>View</th>
                  <th style={{ ...thStyle, width: '210px' }}>Change Role</th>
                  <th style={{ ...thStyle, width: '150px' }}>Access</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr>
                    <td colSpan={9} style={emptyTdStyle}>
                      Loading users...
                    </td>
                  </tr>
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={emptyTdStyle}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((item) => {
                    const primaryRole = getPrimaryRole(item);
                    const isBusy = savingUserId === item.id;
                    const selfUser = isCurrentUser(item);

                    return (
                      <tr
                        key={item.id}
                        style={{
                          opacity: isBusy ? 0.75 : 1,
                          background: selectedIds.includes(String(item.id))
                            ? 'rgba(79,70,229,0.03)'
                            : 'transparent',
                        }}
                      >
                        <td style={tdStyle}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(String(item.id))}
                            onChange={() => toggleSelectUser(item.id)}
                          />
                        </td>

                        <td style={tdStyle}>
                          <div
                            style={{
                              fontWeight: 700,
                              color: 'var(--text, var(--text-main, #0f172a))',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={item.username || '-'}
                          >
                            {item.username || '-'}
                          </div>
                          {selfUser ? (
                            <div
                              style={{
                                marginTop: '4px',
                                fontSize: '11px',
                                fontWeight: 800,
                                color: '#b45309',
                              }}
                            >
                              Current user
                            </div>
                          ) : null}
                        </td>

                        <td style={tdStyle}>
                          <div
                            style={{
                              maxWidth: '100%',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={item.email || '-'}
                          >
                            {item.email || '-'}
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <RoleBadge role={primaryRole} />
                        </td>

                        <td style={tdStyle}>
                          <StatusBadge active={item.active !== false} />
                        </td>

                        <td style={tdStyle}>
                          <div
                            style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={
                              item.lastLoginAt
                                ? new Date(item.lastLoginAt).toLocaleString()
                                : 'Not available'
                            }
                          >
                            {item.lastLoginAt
                              ? new Date(item.lastLoginAt).toLocaleString()
                              : 'Not available'}
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setSelectedUser(item)}
                            style={{ minWidth: '82px', justifyContent: 'center' }}
                          >
                            <Eye size={14} /> View
                          </button>
                        </td>

                        <td style={tdStyle}>
                          <div style={{ minWidth: 0 }}>
                            <select
                              className="input-field"
                              value={primaryRole}
                              disabled={isBusy || selfUser || bulkLoading}
                              onChange={(e) => updateUserRole(item.id, e.target.value)}
                              style={{
                                height: '40px',
                                borderRadius: '12px',
                                minWidth: '200px',
                                width: '100%',
                                maxWidth: '100%',
                                paddingRight: '30px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={selfUser ? 'You cannot change your own role here.' : formatRole(primaryRole)}
                            >
                              <option value="ADMIN">Admin</option>
                              <option value="STORE_MANAGER">Store Manager</option>
                              <option value="PHARMACIST">Pharmacist</option>

                            </select>
                            {isBusy ? (
                              <div
                                style={{
                                  marginTop: '6px',
                                  fontSize: '11px',
                                  color: '#4f46e5',
                                  fontWeight: 700,
                                }}
                              >
                                Updating...
                              </div>
                            ) : selfUser ? (
                              <div
                                style={{
                                  marginTop: '6px',
                                  fontSize: '11px',
                                  color: '#b45309',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Own role locked
                              </div>
                            ) : null}
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <div style={{ minWidth: '120px' }}>
                            {item.active !== false ? (
                              <button
                                type="button"
                                className="btn-secondary"
                                disabled={isBusy || selfUser || bulkLoading}
                                onClick={() => toggleUserStatus(item.id, false)}
                                style={{
                                  color: '#991b1b',
                                  minWidth: '120px',
                                  justifyContent: 'center',
                                }}
                                title={selfUser ? 'You cannot disable your own account here.' : ''}
                              >
                                <Ban size={14} /> {isBusy ? 'Updating...' : 'Disable'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn-secondary"
                                disabled={isBusy || bulkLoading}
                                onClick={() => toggleUserStatus(item.id, true)}
                                style={{
                                  color: '#166534',
                                  minWidth: '120px',
                                  justifyContent: 'center',
                                }}
                              >
                                <CheckCircle2 size={14} /> {isBusy ? 'Updating...' : 'Activate'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              marginTop: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-muted, var(--text-muted, #64748b))',
              }}
            >
              Showing {filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              {' '}to{' '}
              {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} users
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              >
                <ChevronLeft size={14} /> Prev
              </button>

              <div
                style={{
                  minWidth: '90px',
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: 800,
                  color: 'var(--text-muted, var(--text-muted, #64748b))',
                }}
              >
                Page {currentPage} / {totalPages}
              </div>

              <button
                type="button"
                className="btn-secondary"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          icon={Activity}
          title="Audit Activity"
          subtitle="Recent admin and system actions"
        >
          <div style={{ display: 'grid', gap: '12px' }}>
            {auditLoading ? (
              <div style={activityBoxStyle}>Loading audit logs...</div>
            ) : auditLogs.length === 0 ? (
              <div style={activityBoxStyle}>No recent audit activity found.</div>
            ) : (
              auditLogs.slice(0, 8).map((log, index) => (
                <div key={log.id || index} style={activityBoxStyle}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '10px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 800,
                            color: 'var(--text, var(--text-main, #0f172a))',
                          }}
                        >
                          {log.action || 'Activity'}
                        </div>
                        {log.module ? (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              padding: '4px 8px',
                              borderRadius: '999px',
                              background: '#eef2ff',
                              color: '#4338ca',
                            }}
                          >
                            {log.module}
                          </span>
                        ) : null}
                      </div>

                      <div
                        style={{
                          marginTop: '4px',
                          fontSize: '12px',
                          color: 'var(--text-muted, var(--text-muted, #64748b))',
                          lineHeight: 1.6,
                        }}
                      >
                        {log.description || 'System activity recorded.'}
                      </div>

                      <div
                        style={{
                          marginTop: '6px',
                          fontSize: '11px',
                          color: 'var(--text-soft, #94a3b8)',
                          fontWeight: 700,
                          lineHeight: 1.6,
                        }}
                      >
                        By: {log.actorName || log.actor || 'System'}
                        {log.targetName ? ` • Target: ${log.targetName}` : ''}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                        color: 'var(--text-muted, var(--text-muted, #64748b))',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Clock3 size={13} />
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleString()
                        : 'Recent'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(15, 23, 42, 0.55)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  zIndex: 99999,
  boxSizing: 'border-box',
};

const thStyle = {
  textAlign: 'left',
  padding: '14px 16px',
  fontSize: '12px',
  fontWeight: 800,
  color: 'var(--text-muted, var(--text-muted, #64748b))',
  borderBottom: '1px solid var(--border, #e2e8f0)',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '14px 16px',
  fontSize: '13px',
  color: 'var(--text-muted, var(--text-muted, #475569))',
  borderBottom: '1px solid var(--border, #e2e8f0)',
  verticalAlign: 'middle',
};

const emptyTdStyle = {
  padding: '24px 16px',
  textAlign: 'center',
  fontSize: '13px',
  color: 'var(--text-muted, var(--text-muted, #64748b))',
};

const activityBoxStyle = {
  padding: '14px 16px',
  borderRadius: '18px',
  background: 'var(--bg-soft, var(--bg-card-soft, #f8fafc))',
  border: '1px solid var(--border, #e2e8f0)',
};

const infoBoxStyle = {
  padding: '16px 16px',
  borderRadius: '18px',
  background: 'var(--bg-soft, var(--bg-card-soft, #f8fafc))',
  border: '1px solid var(--border, #e2e8f0)',
  minHeight: '86px',
};

const infoLabelStyle = {
  fontSize: '12px',
  fontWeight: 800,
  color: 'var(--text-muted, var(--text-muted, #64748b))',
};

const infoValueStyle = {
  marginTop: '8px',
  fontSize: '16px',
  fontWeight: 800,
  color: 'var(--text, var(--text-main, #0f172a))',
  lineHeight: 1.5,
};

const headFlexStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
};