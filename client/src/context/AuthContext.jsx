import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const getStoredToken = () => sessionStorage.getItem('spms_token') || localStorage.getItem('spms_token');
  const getStoredUser = () => {
    const raw = sessionStorage.getItem('spms_user') || localStorage.getItem('spms_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  };

  const [user, setUser] = useState(getStoredUser());
  const [token, setToken] = useState(getStoredToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getStoredToken();
      const storedUser = getStoredUser();

      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          setUser(storedUser);
        }
        // Verify token with backend
        try {
          const res = await api.get('/auth/me');
          if (res.data && res.data.user) {
            setUser(res.data.user);
            sessionStorage.setItem('spms_user', JSON.stringify(res.data.user));
            localStorage.setItem('spms_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.warn('Session check failed or expired, clearing session.');
          sessionStorage.removeItem('spms_token');
          sessionStorage.removeItem('spms_user');
          localStorage.removeItem('spms_token');
          localStorage.removeItem('spms_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.success) {
      const { token: receivedToken, user: receivedUser } = response.data;
      // Store in sessionStorage for isolated tab session
      sessionStorage.setItem('spms_token', receivedToken);
      sessionStorage.setItem('spms_user', JSON.stringify(receivedUser));
      // Store in localStorage as fallback
      localStorage.setItem('spms_token', receivedToken);
      localStorage.setItem('spms_user', JSON.stringify(receivedUser));
      setToken(receivedToken);
      setUser(receivedUser);
      return receivedUser;
    } else {
      throw new Error(response.data.message || 'Login failed.');
    }
  };

  const register = async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.success) {
      const { token: receivedToken, user: receivedUser } = response.data;
      sessionStorage.setItem('spms_token', receivedToken);
      sessionStorage.setItem('spms_user', JSON.stringify(receivedUser));
      localStorage.setItem('spms_token', receivedToken);
      localStorage.setItem('spms_user', JSON.stringify(receivedUser));
      setToken(receivedToken);
      setUser(receivedUser);
      return receivedUser;
    } else {
      throw new Error(response.data.message || 'Registration failed.');
    }
  };

  const logout = () => {
    sessionStorage.removeItem('spms_token');
    sessionStorage.removeItem('spms_user');
    localStorage.removeItem('spms_token');
    localStorage.removeItem('spms_user');
    setToken(null);
    setUser(null);
  };

  const updateUserProfile = (updatedUser) => {
    setUser(updatedUser);
    sessionStorage.setItem('spms_user', JSON.stringify(updatedUser));
    localStorage.setItem('spms_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        updateUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
