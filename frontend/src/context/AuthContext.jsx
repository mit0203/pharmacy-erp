import { createContext, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);

const parseJson = (value, fallback = null) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const normalizeRoles = (roles) => {
  if (Array.isArray(roles)) {
    return roles
      .filter(Boolean)
      .map((role) => String(role).trim())
      .filter(Boolean);
  }

  if (typeof roles === 'string' && roles.trim()) {
    return [roles.trim()];
  }

  return [];
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = parseJson(localStorage.getItem('user'), null);

    if (!storedUser) return null;

    return {
      id: storedUser.id || '',
      username: storedUser.username || '',
      email: storedUser.email || '',
      roles: normalizeRoles(storedUser.roles),
      refreshToken:
        storedUser.refreshToken || localStorage.getItem('refreshToken') || '',
    };
  });

  const [token, setToken] = useState(() => localStorage.getItem('token') || '');

  const login = (tokenValue, userData = {}) => {
    const safeToken = tokenValue || '';
    const safeRefreshToken = userData.refreshToken || '';

    const normalizedUser = {
      id: userData.id || '',
      username: userData.username || '',
      email: userData.email || '',
      roles: normalizeRoles(userData.roles),
      refreshToken: safeRefreshToken,
    };

    localStorage.setItem('token', safeToken);
    localStorage.setItem('user', JSON.stringify(normalizedUser));

    if (safeRefreshToken) {
      localStorage.setItem('refreshToken', safeRefreshToken);
    } else {
      localStorage.removeItem('refreshToken');
    }

    setToken(safeToken);
    setUser(normalizedUser);
  };

  const updateUser = (partialUser = {}) => {
    setUser((prev) => {
      if (!prev) return prev;

      const nextUser = {
        ...prev,
        ...partialUser,
        roles: partialUser.roles ? normalizeRoles(partialUser.roles) : prev.roles,
      };

      localStorage.setItem('user', JSON.stringify(nextUser));
      return nextUser;
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberLogin');

    setToken('');
    setUser(null);
  };

  const isAuthenticated = !!token;

  const hasRole = (role) => {
    if (!role || !user?.roles?.length) return false;
    return user.roles.includes(role);
  };

  const hasAnyRole = (roles = []) => {
    if (!Array.isArray(roles) || !roles.length || !user?.roles?.length) {
      return false;
    }

    return roles.some((role) => user.roles.includes(role));
  };

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      updateUser,
      logout,
      isAuthenticated,
      hasRole,
      hasAnyRole,
    }),
    [user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return ctx;
};