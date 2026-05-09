import { useEffect, useMemo, useState } from 'react';
import {
  Settings,
  RefreshCw,
  User,
  Mail,
  CheckCircle2,
  Edit3,
  KeyRound,
  Sparkles,
  BadgeCheck,
  Shield,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
} from '../api/services';

function parseApiError(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function formatRole(role) {
  if (!role) return '';
  return String(role)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function SettingsCard({ icon: Icon, title, subtitle, children, badge, accent = '#4f46e5' }) {
  return (
    <div className="card" style={cardStyle}>
      <div
        style={{
          position: 'absolute',
          right: '-35px',
          top: '-35px',
          width: '130px',
          height: '130px',
          borderRadius: '50%',
          background: `${accent}12`,
          pointerEvents: 'none',
        }}
      />

      <div style={cardHeaderStyle}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '18px',
              background: `${accent}14`,
              border: `1px solid ${accent}24`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={21} color={accent} />
          </div>

          <div>
            <h2 style={cardTitleStyle}>{title}</h2>
            <p style={cardSubtitleStyle}>{subtitle}</p>
          </div>
        </div>

        {badge ? <span style={badgeStyle}>{badge}</span> : null}
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}

function StatChip({ icon: Icon, label, value, color = '#4f46e5' }) {
  return (
    <div style={statChipStyle}>
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '15px',
          background: `${color}14`,
          border: `1px solid ${color}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={18} color={color} />
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={statLabelStyle}>{label}</div>
        <div style={statValueStyle}>{value}</div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, updateUser, hasAnyRole, logout } = useAuth();

  const isAdmin = hasAnyRole(['ADMIN']);
  const isManager = hasAnyRole(['STORE_MANAGER']);

  const [profile, setProfile] = useState({
    username: '',
    email: '',
    roles: [],
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('pharmacy_theme') || 'system');

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('pharmacy_theme', newTheme);
    if (newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    setToast({ type: 'success', message: 'Theme updated successfully.' });
  };

  const roleLabel = useMemo(() => {
    if (isAdmin) return 'Administrator';
    if (isManager) return 'Store Manager';
    return 'Pharmacist';
  }, [isAdmin, isManager]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadProfile = async () => {
    setLoading(true);
    setError('');

    try {
      const profileResponse = await getMyProfile();
      const profileData = profileResponse?.data?.data || {};

      setProfile({
        username: profileData.username || '',
        email: profileData.email || '',
        roles: profileData.roles || [],
      });
    } catch (err) {
      console.error(err);
      const message = parseApiError(err, 'Failed to load profile.');
      setError(message);
      setToast({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    const username = String(profile.username || '').trim();
    const email = String(profile.email || '').trim().toLowerCase();

    if (!username) {
      setToast({ type: 'error', message: 'Username is required.' });
      return;
    }

    if (username.length < 3) {
      setToast({ type: 'error', message: 'Username must be at least 3 characters.' });
      return;
    }

    if (!email) {
      setToast({ type: 'error', message: 'Email is required.' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setToast({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    try {
      setSavingProfile(true);
      setError('');

      const response = await updateMyProfile({ username, email });
      const saved = response?.data?.data || {};

      const nextProfile = {
        username: saved.username || username,
        email: saved.email || email,
        roles: saved.roles || profile.roles,
      };

      setProfile(nextProfile);

      updateUser({
        username: nextProfile.username,
        email: nextProfile.email,
      });

      setToast({ type: 'success', message: 'Profile updated successfully.' });
    } catch (err) {
      console.error(err);
      setToast({
        type: 'error',
        message: parseApiError(err, 'Failed to update profile.'),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    const currentPassword = String(passwordForm.currentPassword || '');
    const newPassword = String(passwordForm.newPassword || '');
    const confirmPassword = String(passwordForm.confirmPassword || '');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setToast({ type: 'error', message: 'Please fill all password fields.' });
      return;
    }

    if (newPassword.length < 6) {
      setToast({ type: 'error', message: 'New password must be at least 6 characters.' });
      return;
    }

    if (currentPassword === newPassword) {
      setToast({
        type: 'error',
        message: 'New password must be different from current password.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setToast({
        type: 'error',
        message: 'New password and confirm password do not match.',
      });
      return;
    }

    try {
      setSavingPassword(true);
      setError('');

      await changeMyPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setToast({
        type: 'success',
        message: 'Password changed successfully. Please login again.',
      });

      setTimeout(() => {
        logout();
        window.location.href = '/login';
      }, 1200);
    } catch (err) {
      console.error(err);
      setToast({
        type: 'error',
        message: parseApiError(err, 'Failed to change password.'),
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div style={{ paddingBottom: '24px', width: '100%', maxWidth: '100%' }}>
      <div style={heroStyle}>
        <div style={heroTopStyle}>
          <div style={{ minWidth: 0 }}>
            <div style={heroBadgeStyle}>
              <Sparkles size={14} />
              Account Settings
            </div>

            <h1 style={heroTitleStyle}>
              <Settings size={32} color="#2d3a8c" />
              Settings
            </h1>

            <p style={heroTextStyle}>
              Manage your account profile and password with a clean, secure, and modern interface.
            </p>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={loadProfile}
            disabled={loading}
          >
            <RefreshCw size={16} /> {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div style={chipsWrapStyle}>
          <StatChip icon={User} label="User" value={profile.username || user?.username || 'User'} />
          <StatChip icon={BadgeCheck} label="Role" value={roleLabel} color="#16a34a" />
          <StatChip icon={Shield} label="Account" value="Protected" color="#dc2626" />
        </div>
      </div>

      {toast ? (
        <div
          style={{
            ...toastStyle,
            background: toast.type === 'error' ? 'var(--bg-card, #ffffff)1f2' : '#f0fdf4',
            color: toast.type === 'error' ? '#be123c' : '#166534',
            border: `1px solid ${toast.type === 'error' ? '#fecdd3' : '#bbf7d0'}`,
          }}
        >
          {toast.message}
        </div>
      ) : null}

      {error ? <div style={errorBoxStyle}>{error}</div> : null}

      <div style={mainGridStyle}>
        <SettingsCard
          icon={User}
          title="Profile Information"
          subtitle="Update your username and email address"
          badge={roleLabel}
          accent="#4f46e5"
        >
          <div style={profileBoxStyle}>
            <div style={avatarStyle}>
              {String(profile.username || user?.username || 'U').slice(0, 1).toUpperCase()}
            </div>

            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label style={labelStyle}>Username</label>
                <input
                  className="input-field"
                  value={profile.username}
                  onChange={(e) => setProfile((prev) => ({ ...prev, username: e.target.value }))}
                  style={inputStyle}
                  placeholder="Enter username"
                  disabled={savingProfile}
                />
              </div>

              <div>
                <label style={labelStyle}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={16}
                    color="var(--text-soft, #94a3b8)"
                    style={{ position: 'absolute', left: '14px', top: '17px' }}
                  />
                  <input
                    className="input-field"
                    value={profile.email}
                    onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                    style={{ ...inputStyle, paddingLeft: '42px' }}
                    placeholder="Enter email"
                    disabled={savingProfile}
                  />
                </div>
              </div>

              <div>
                <div style={labelStyle}>Assigned Roles</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(profile.roles?.length ? profile.roles : user?.roles || []).map((role) => (
                    <span key={role} style={rolePillStyle}>
                      {formatRole(role)}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                style={{
                  width: 'fit-content',
                  marginTop: '4px',
                  boxShadow: '0 12px 28px rgba(79, 70, 229, 0.25)',
                }}
              >
                <Edit3 size={16} /> {savingProfile ? 'Saving...' : 'Update Profile'}
              </button>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          icon={KeyRound}
          title="Change Password"
          subtitle="Securely update your login password"
          badge="Secure"
          accent="#0ea5e9"
        >
          <div style={passwordBoxStyle}>
            <div style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Current Password</label>
                <input
                  type="password"
                  className="input-field"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                  }
                  style={inputStyle}
                  placeholder="Enter current password"
                  disabled={savingPassword}
                />
              </div>

              <div>
                <label style={labelStyle}>New Password</label>
                <input
                  type="password"
                  className="input-field"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                  }
                  style={inputStyle}
                  placeholder="Enter new password"
                  disabled={savingPassword}
                />
              </div>

              <div>
                <label style={labelStyle}>Confirm New Password</label>
                <input
                  type="password"
                  className="input-field"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  style={inputStyle}
                  placeholder="Confirm new password"
                  disabled={savingPassword}
                />
              </div>

              <div style={passwordHintBoxStyle}>
                <div style={passwordHintTitleStyle}>
                  <Lock size={15} />
                  Password rules
                </div>
                Password must be at least 6 characters and different from your current password.
                After changing password, you will be logged out automatically.
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={handleChangePassword}
                disabled={savingPassword}
                style={{
                  width: 'fit-content',
                  boxShadow: '0 12px 28px rgba(14, 165, 233, 0.22)',
                }}
              >
                <KeyRound size={16} /> {savingPassword ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          icon={Sparkles}
          title="Appearance"
          subtitle="Customize the look and feel of the application"
          badge="Theme"
          accent="#8b5cf6"
        >
          <div style={themeBoxStyle}>
            <div style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Theme Preference</label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {['light', 'dark', 'system'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleThemeChange(t)}
                      style={{
                        ...themeBtnStyle,
                        borderColor: theme === t ? '#8b5cf6' : 'var(--border-color, #e2e8f0)',
                        background: theme === t ? 'rgba(139, 92, 246, 0.1)' : 'var(--bg-card, var(--bg-card, #ffffff))',
                        color: theme === t ? '#8b5cf6' : 'var(--text-main, #1a202c)',
                      }}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </SettingsCard>
      </div>

      <div style={infoStripStyle}>
        <CheckCircle2 size={18} color="#16a34a" />
        <span>
          Your account information is protected. Role changes can only be managed from the Admin Panel.
        </span>
      </div>
    </div>
  );
}

const heroStyle = {
  marginBottom: '22px',
  padding: '26px',
  borderRadius: '30px',
  background:
    'linear-gradient(135deg, rgba(79,70,229,0.08) 0%, rgba(59,130,246,0.06) 55%, rgba(16,185,129,0.05) 100%)',
  border: '1px solid var(--border, #e2e8f0)',
  boxShadow: 'var(--shadow-soft, 0 10px 30px rgba(15, 23, 42, 0.06))',
};

const heroTopStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '18px',
  flexWrap: 'wrap',
};

const heroBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 14px',
  borderRadius: '999px',
  background: 'rgba(79, 70, 229, 0.10)',
  border: '1px solid rgba(79, 70, 229, 0.16)',
  color: '#4338ca',
  fontSize: '12px',
  fontWeight: 800,
  marginBottom: '14px',
};

const heroTitleStyle = {
  fontSize: '34px',
  fontWeight: 900,
  color: 'var(--text, var(--text-main, #111827))',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  margin: 0,
  lineHeight: 1.15,
};

const heroTextStyle = {
  fontSize: '14px',
  color: 'var(--text-muted, var(--text-muted, #64748b))',
  marginTop: '10px',
  lineHeight: 1.7,
  maxWidth: '760px',
};

const chipsWrapStyle = {
  marginTop: '18px',
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
};

const mainGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(340px, 0.9fr)',
  gap: '18px',
  alignItems: 'start',
};

const cardStyle = {
  padding: '22px',
  borderRadius: '28px',
  overflow: 'hidden',
  boxShadow: 'var(--shadow-soft, 0 10px 30px rgba(15, 23, 42, 0.06))',
  border: '1px solid var(--border, #e2e8f0)',
  position: 'relative',
  minWidth: 0,
};

const cardHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  alignItems: 'flex-start',
  marginBottom: '18px',
  flexWrap: 'wrap',
  position: 'relative',
  zIndex: 1,
};

const cardTitleStyle = {
  margin: 0,
  fontSize: '19px',
  fontWeight: 800,
  color: 'var(--text, var(--text-main, #0f172a))',
  lineHeight: 1.2,
};

const cardSubtitleStyle = {
  margin: '5px 0 0',
  fontSize: '12px',
  color: 'var(--text-muted, var(--text-muted, #64748b))',
  lineHeight: 1.55,
};

const badgeStyle = {
  padding: '8px 12px',
  borderRadius: '999px',
  background: 'var(--bg-soft, var(--bg-card-soft, #f8fafc))',
  color: 'var(--text-muted, var(--text-muted, #475569))',
  fontSize: '11px',
  fontWeight: 800,
  border: '1px solid var(--border, #e2e8f0)',
};

const statChipStyle = {
  flex: 1,
  minWidth: '180px',
  padding: '16px 18px',
  borderRadius: '20px',
  background: 'var(--bg-elevated, var(--bg-card, var(--bg-card, #ffffff)fff))',
  border: '1px solid var(--border, #e2e8f0)',
  boxShadow: 'var(--shadow-soft, 0 10px 30px rgba(15, 23, 42, 0.06))',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const statLabelStyle = {
  fontSize: '11px',
  fontWeight: 800,
  color: 'var(--text-muted, var(--text-muted, #64748b))',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
};

const statValueStyle = {
  marginTop: '4px',
  fontSize: '15px',
  fontWeight: 800,
  color: 'var(--text, var(--text-main, #0f172a))',
  lineHeight: 1.3,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const toastStyle = {
  marginBottom: '16px',
  padding: '14px 16px',
  borderRadius: '18px',
  fontSize: '13px',
  fontWeight: 800,
  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)',
};

const errorBoxStyle = {
  marginBottom: '16px',
  padding: '14px 16px',
  borderRadius: '18px',
  background: 'var(--bg-card, #ffffff)7ed',
  color: '#9a3412',
  border: '1px solid #fed7aa',
  fontSize: '13px',
  fontWeight: 800,
};

const profileBoxStyle = {
  padding: '20px',
  borderRadius: '24px',
  background:
    'linear-gradient(135deg, rgba(79,70,229,0.06) 0%, rgba(59,130,246,0.04) 100%)',
  border: '1px solid var(--border, #e2e8f0)',
};

const passwordBoxStyle = {
  padding: '20px',
  borderRadius: '24px',
  background:
    'linear-gradient(135deg, rgba(14,165,233,0.06) 0%, rgba(59,130,246,0.04) 100%)',
  border: '1px solid var(--border, #e2e8f0)',
};

const avatarStyle = {
  width: '76px',
  height: '76px',
  borderRadius: '24px',
  background: 'linear-gradient(135deg, #312e81 0%, #3b82f6 100%)',
  color: 'var(--bg-card, var(--bg-card, #ffffff)fff)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '28px',
  fontWeight: 900,
  marginBottom: '18px',
  boxShadow: '0 16px 36px rgba(49, 46, 129, 0.30)',
};

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 800,
  color: 'var(--text-muted, var(--text-muted, #64748b))',
  marginBottom: '8px',
};

const inputStyle = {
  height: '50px',
  borderRadius: '16px',
};

const rolePillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '8px 13px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 800,
  color: '#1d4ed8',
  background: '#dbeafe',
  boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.12)',
};

const passwordHintBoxStyle = {
  padding: '14px 16px',
  borderRadius: '18px',
  background: 'rgba(14,165,233,0.08)',
  border: '1px solid rgba(14,165,233,0.16)',
  fontSize: '12px',
  color: 'var(--text-muted, var(--text-muted, #475569))',
  lineHeight: 1.7,
};

const passwordHintTitleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '5px',
  fontWeight: 800,
  color: '#0369a1',
};

const infoStripStyle = {
  marginTop: '18px',
  padding: '16px 18px',
  borderRadius: '20px',
  background: '#f0fdf4',
  border: '1px solid #bbf7d0',
  color: '#166534',
  fontSize: '13px',
  fontWeight: 700,
  display: 'flex',
  gap: '10px',
  alignItems: 'center',
};

const themeBoxStyle = {
  padding: '20px',
  borderRadius: '24px',
  background: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(139,92,246,0.02) 100%)',
  border: '1px solid var(--border)',
};

const themeBtnStyle = {
  padding: '12px 24px',
  borderRadius: '16px',
  border: '2px solid',
  fontSize: '13.5px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: '1',
  minWidth: '100px',
};