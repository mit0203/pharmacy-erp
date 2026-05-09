import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPasswordWithOtp,
} from '../api/services';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=new password
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);

  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    clearMessages();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Please enter your email.');
      return;
    }

    setLoading(true);
    try {
      await sendForgotPasswordOtp({ email: trimmedEmail });
      setSuccess('OTP sent to your email successfully.');
      setStep(2);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to send OTP. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!otp.trim()) {
      setError('Please enter the OTP.');
      return;
    }

    setLoading(true);
    try {
      await verifyForgotPasswordOtp({
        email: email.trim(),
        otp: otp.trim(),
      });

      setOtpVerified(true);
      setSuccess('OTP verified successfully.');
      setStep(3);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Invalid OTP. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearMessages();

    const newPassword = passwords.newPassword;
    const confirmPassword = passwords.confirmPassword;

    if (!otpVerified) {
      setError('Please verify OTP first.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('Please enter both password fields.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordWithOtp({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });

      setSuccess('Password reset successful. Redirecting to login...');

      setTimeout(() => {
        navigate('/login');
      }, 1200);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to reset password. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 1, label: 'Email' },
      { id: 2, label: 'OTP' },
      { id: 3, label: 'Reset' },
    ];

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          marginBottom: '28px',
        }}
      >
        {steps.map((item, index) => {
          const active = step === item.id;
          const completed = step > item.id;

          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '700',
                  background: completed || active ? '#2d3a8c' : '#e2e8f0',
                  color: completed || active ? 'var(--bg-card, #ffffff)' : '#718096',
                }}
              >
                {item.id}
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: active ? '700' : '600',
                  color: active ? '#2d3a8c' : '#718096',
                }}
              >
                {item.label}
              </span>
              {index < steps.length - 1 && (
                <div
                  style={{
                    width: '28px',
                    height: '2px',
                    background: step > item.id ? '#2d3a8c' : '#e2e8f0',
                    borderRadius: '999px',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="login-page"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background:
          'linear-gradient(135deg, #eef2ff 0%, #f8fbff 38%, #edf7ff 100%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '500px',
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
            Forgot Password
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: '#718096',
              marginTop: '8px',
            }}
          >
            Reset your ERP account securely using email OTP verification.
          </p>
        </div>

        <div
          className="login-card animate-fade-in"
          style={{
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid rgba(232, 236, 244, 0.9)',
            boxShadow: '0 24px 60px rgba(45, 58, 140, 0.12)',
            background: 'rgba(255,255,255,0.97)',
          }}
        >
          {renderStepIndicator()}

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
              }}
            >
              {error}
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

          {step === 1 && (
            <form onSubmit={handleSendOtp}>
              <div className="input-group">
                <label className="input-label">Registered Email</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" />
                  <input
                    type="email"
                    className="input-field"
                    placeholder="name@gmail.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearMessages();
                    }}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '13px' }}
                disabled={loading}
              >
                {loading ? 'Sending OTP...' : <>Send OTP <ArrowRight size={16} /></>}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp}>
              <div className="input-group">
                <label className="input-label">Email</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" />
                  <input
                    type="email"
                    className="input-field"
                    value={email}
                    disabled
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Enter OTP</label>
                <div className="input-wrapper">
                  <KeyRound className="input-icon" />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value);
                      clearMessages();
                    }}
                    maxLength={6}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => {
                    setStep(1);
                    clearMessages();
                  }}
                  disabled={loading}
                >
                  <ArrowLeft size={16} /> Back
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword}>
              <div className="input-group">
                <label className="input-label">New Password</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    className="input-field"
                    placeholder="Enter new password"
                    value={passwords.newPassword}
                    onChange={(e) => {
                      setPasswords((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }));
                      clearMessages();
                    }}
                    required
                    disabled={loading}
                    style={{ paddingRight: '42px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    disabled={loading}
                    style={eyeBtnStyle}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Confirm Password</label>
                <div className="input-wrapper">
                  <ShieldCheck className="input-icon" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="input-field"
                    placeholder="Confirm new password"
                    value={passwords.confirmPassword}
                    onChange={(e) => {
                      setPasswords((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }));
                      clearMessages();
                    }}
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

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => {
                    setStep(2);
                    clearMessages();
                  }}
                  disabled={loading}
                >
                  <ArrowLeft size={16} /> Back
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={loading}
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          )}

          <div
            style={{
              marginTop: '24px',
              textAlign: 'center',
              borderTop: '1px solid #f0f2f8',
              paddingTop: '18px',
            }}
          >
            <Link
              to="/login"
              style={{
                fontSize: '13px',
                color: '#2d3a8c',
                textDecoration: 'none',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ArrowLeft size={14} /> Back to Login
            </Link>
          </div>
        </div>
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