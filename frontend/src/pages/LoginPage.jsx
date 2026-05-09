import { useEffect, useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { loginApi } from '../api/services';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPageVisible, setIsPageVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsPageVisible(true), 40);
    return () => clearTimeout(timer);
  }, []);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const usernameOrEmail = form.email.trim();
    const password = form.password;

    if (!usernameOrEmail || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await loginApi({
        usernameOrEmail,
        password,
      });

      const responseData = res?.data;
      const data = responseData?.data || responseData;

      const accessToken =
        data?.accessToken ||
        data?.token ||
        data?.jwt ||
        '';

      const refreshToken = data?.refreshToken || '';

      if (!accessToken) {
        throw new Error('No access token received from server.');
      }

      const rolesRaw = data?.roles;
      const roles = Array.isArray(rolesRaw)
        ? rolesRaw
        : rolesRaw
          ? [rolesRaw]
          : [];

      const userInfo = {
        id: data?.id || '',
        username: data?.username || usernameOrEmail.split('@')[0],
        email: data?.email || usernameOrEmail,
        roles,
        refreshToken,
      };

      try {
        localStorage.setItem('rememberLogin', remember ? 'true' : 'false');
      } catch {
        // ignore storage issues
      }

      setIsLeaving(true);

      setTimeout(() => {
        login(accessToken, userInfo);
        navigate('/dashboard', { replace: true });
      }, 350);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Invalid credentials. Please try again.';

      setError(msg);
      setIsLeaving(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-page"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background:
          'radial-gradient(circle at top left, rgba(45,58,140,0.12), transparent 28%), radial-gradient(circle at top right, rgba(0,180,216,0.10), transparent 26%), linear-gradient(135deg, #eef2ff 0%, #f7faff 42%, #edf6ff 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'rgba(45,58,140,0.08)',
            top: '-60px',
            left: '-40px',
            filter: 'blur(10px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: 'rgba(0,180,216,0.10)',
            bottom: '40px',
            right: '-60px',
            filter: 'blur(12px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '18%',
            left: '10%',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: 'rgba(45,58,140,0.16)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '24%',
            left: '14%',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'rgba(0,180,216,0.18)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '21%',
            left: '18%',
            width: '42px',
            height: '2px',
            background: 'rgba(45,58,140,0.14)',
            transform: 'rotate(24deg)',
          }}
        />
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          position: 'relative',
          zIndex: 2,
          transform: isLeaving
            ? 'translateY(-10px) scale(0.985)'
            : isPageVisible
              ? 'translateY(0) scale(1)'
              : 'translateY(22px) scale(0.985)',
          opacity: isLeaving ? 0 : isPageVisible ? 1 : 0,
          transition: 'all 360ms ease',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1
            style={{
              fontSize: '30px',
              fontWeight: '800',
              color: '#2d3a8c',
              letterSpacing: '-0.7px',
            }}
          >
            Sygnus Biotech
          </h1>
          <p
            style={{
              fontSize: '12px',
              color: '#718096',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginTop: '6px',
            }}
          >
            Clinical Curator ERP
          </p>
        </div>

        <div
          className="login-card animate-fade-in"
          style={{
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid rgba(232, 236, 244, 0.9)',
            boxShadow: '0 24px 60px rgba(45, 58, 140, 0.12)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'rgba(45,58,140,0.05)',
            }}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #f0f4ff 0%, #eefbff 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(45,58,140,0.12)',
                overflow: 'hidden',
                border: '1px solid #e5ecff',
              }}
            >
              <img
                src="/logo.png"
                alt="Sygnus Biotech"
                style={{ width: '62px', height: '62px', objectFit: 'contain' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement.innerHTML =
                    '<span style="font-size:22px;font-weight:800;color:#2d3a8c">SB</span>';
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '6px',
            }}
          >
            <h2
              style={{
                fontSize: '28px',
                fontWeight: '800',
                color: '#1a202c',
                letterSpacing: '-0.5px',
              }}
            >
              Welcome back
            </h2>
            <Sparkles size={18} color="#2d3a8c" />
          </div>

          <p
            style={{
              fontSize: '13.5px',
              color: '#718096',
              marginBottom: '28px',
              lineHeight: 1.6,
            }}
          >
            Sign in to manage pharmacy inventory, batches, purchases, sales, and reports.
          </p>

          <form onSubmit={handleSubmit}>
            {error && (
              <div
                style={{
                  background: '#feeae9',
                  border: '1px solid #fca5a5',
                  borderRadius: '10px',
                  padding: '11px 14px',
                  marginBottom: '18px',
                  fontSize: '13px',
                  color: '#c0392b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Email or Username</label>
              <div className="input-wrapper">
                <Mail className="input-icon" />
                <input
                  id="email"
                  type="text"
                  name="email"
                  className="input-field"
                  placeholder="Enter email or username"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="username"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">
                <span>Password</span>
                <Link
                  to="/forgot-password"
                  style={{
                    color: '#2d3a8c',
                    fontWeight: '600',
                    fontSize: '12px',
                    textDecoration: 'none',
                  }}
                >
                  Forgot Password?
                </Link>
              </label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="input-field"
                  placeholder="••••••••••••"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  style={{ paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#a0aec0',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '24px',
                flexWrap: 'wrap',
              }}
            >
              <label
                htmlFor="remember"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  color: '#4a5568',
                  cursor: 'pointer',
                }}
              >
                <input
                  id="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: '#2d3a8c',
                    cursor: 'pointer',
                  }}
                />
                Keep me logged in on this device
              </label>

              <Link
                to="/register"
                style={{
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#2d3a8c',
                  textDecoration: 'none',
                }}
              >
                Create account
              </Link>
            </div>

            <button
              id="login-btn"
              type="submit"
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '13px',
                fontSize: '14px',
                opacity: loading ? 0.92 : 1,
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner" />
                  Authenticating...
                </>
              ) : (
                <>
                  Authenticate Access <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div
            style={{
              marginTop: '28px',
              textAlign: 'center',
              borderTop: '1px solid #f0f2f8',
              paddingTop: '20px',
            }}
          >
            <p
              style={{
                fontSize: '11.5px',
                color: 'var(--text-soft, #94a3b8)',
                lineHeight: 1.7,
              }}
            >
              Authorized personnel only. Inventory actions, purchases, sales, and account activity are logged and audited.
            </p>
          </div>
        </div>

        <p
          style={{
            marginTop: '24px',
            fontSize: '11px',
            color: '#a0aec0',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          © 2026 Sygnus Biotech Clinical Systems
        </p>
      </div>
    </div>
  );
}