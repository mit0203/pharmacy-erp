import { useEffect, useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { registerApi } from '../api/services';

export default function RegisterPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    if (success) setSuccess('');
  };

  const validateForm = () => {
    const username = form.username.trim();
    const email = form.email.trim();
    const password = form.password;
    const confirmPassword = form.confirmPassword;

    if (!username || !email || !password || !confirmPassword) {
      return 'Please fill all fields.';
    }

    if (username.length < 2) {
      return 'Username must be at least 2 characters.';
    }

    if (password.length < 6) {
      return 'Password must be at least 6 characters.';
    }

    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }

    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await registerApi({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });

      setSuccess('Registration successful. Redirecting to login...');
      setIsLeaving(true);

      setTimeout(() => {
        navigate('/login');
      }, 1200);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data?.details ||
        'Registration failed. Please try again.';

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
          opacity: isLeaving ? 0.75 : isPageVisible ? 1 : 0,
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

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: '800',
                color: '#1a202c',
                letterSpacing: '-0.5px',
              }}
            >
              Create account
            </h2>
            <Sparkles size={18} color="#2d3a8c" />
          </div>

          <p style={{ fontSize: '13.5px', color: '#718096', marginBottom: '28px', lineHeight: 1.6 }}>
            Register a new ERP user account to access pharmacy inventory, sales, purchases, and reports.
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

            {success && (
              <div
                style={{
                  background: '#e8f8ef',
                  border: '1px solid #86efac',
                  borderRadius: '10px',
                  padding: '11px 14px',
                  marginBottom: '18px',
                  fontSize: '13px',
                  color: '#166534',
                }}
              >
                {success}
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Username</label>
              <div className="input-wrapper">
                <User className="input-icon" />
                <input
                  id="username"
                  type="text"
                  name="username"
                  className="input-field"
                  placeholder="Enter username"
                  value={form.username}
                  onChange={handleChange}
                  autoComplete="username"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Email</label>
              <div className="input-wrapper">
                <Mail className="input-icon" />
                <input
                  id="email"
                  type="email"
                  name="email"
                  className="input-field"
                  placeholder="name@gmail.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="input-field"
                  placeholder="Create password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                  disabled={loading}
                  style={{ paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  style={eyeBtnStyle}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Confirm Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  className="input-field"
                  placeholder="Confirm password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                  disabled={loading}
                  style={{ paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  disabled={loading}
                  style={eyeBtnStyle}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
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
                  Creating account...
                </>
              ) : (
                <>
                  Create Account <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div
            style={{
              marginTop: '24px',
              textAlign: 'center',
              borderTop: '1px solid #f0f2f8',
              paddingTop: '18px',
            }}
          >
            <p style={{ fontSize: '13px', color: '#718096' }}>
              Already have an account?{' '}
              <Link
                to="/login"
                style={{
                  color: '#2d3a8c',
                  fontWeight: '700',
                  textDecoration: 'none',
                }}
              >
                Sign in
              </Link>
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

const eyeBtnStyle = {
  position: 'absolute',
  right: '12px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#a0aec0',
  display: 'flex',
  alignItems: 'center',
};