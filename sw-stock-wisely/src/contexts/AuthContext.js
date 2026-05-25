import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Configure axios defaults
function resolveApiBase() {
  const overridden = process.env.REACT_APP_API_URL;
  if (overridden && overridden.trim()) return overridden.endsWith('/api') ? overridden : `${overridden.replace(/\/+$/, '')}/api`;
  const isLocal = typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname);
  if (isLocal) {
    const devPortMap = { '3000': '5000', '3001': '5000', '3002': '5000' };
    const port = window.location.port || '3000';
    const backendPort = devPortMap[port] || '5000';
    return `http://${window.location.hostname}:${backendPort}/api`;
  }
  return 'http://localhost:5000/api';
}
const API_BASE_URL = resolveApiBase();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration and errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        // Verify token is still valid
        verifyToken();
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.success) {
        setUser(response.data.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      setError(null);
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.success) {
        const { token, user } = response.data.data;
        setUser(user);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        return { success: true, user };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const signUp = async (userData) => {
    try {
      setError(null);
      const response = await api.post('/auth/register', userData);
      
      if (response.data.success) {
        const { userId, email, requiresVerification } = response.data.data;
        return { 
          success: true, 
          userId, 
          email, 
          requiresVerification 
        };
      }
    } catch (error) {
      // Prefer detailed validator messages when available
      const errors = error.response?.data?.errors;
      const errorMessage = errors && Array.isArray(errors) && errors.length > 0
        ? errors[0].msg
        : (error.response?.data?.message || 'Registration failed');
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const verifyEmail = async (email, code) => {
    try {
      setError(null);
      const response = await api.post('/auth/verify-email', { email, code });
      
      if (response.data.success) {
        const { token, user } = response.data.data;
        setUser(user);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        return { success: true, user };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Email verification failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const resendVerificationEmail = async (email) => {
    try {
      setError(null);
      const response = await api.post('/auth/resend-verification', { email });
      
      if (response.data.success) {
        return { success: true };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to resend verification email';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const signInWithGoogle = () => {
    // Redirect to Google OAuth with return URL
    const returnTo = window.location.origin;
    window.location.href = `${API_BASE_URL}/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
  };

  const handleGoogleCallback = useCallback(async (token, userData) => {
    try {
      setError(null);
      // Parse user data if it's a JSON string
      let parsedUser = userData;
      if (typeof userData === 'string') {
        try {
          parsedUser = JSON.parse(userData);
        } catch (e) {
          console.error('Failed to parse Google user data:', e);
          throw new Error('Invalid user data from Google');
        }
      }

      setUser(parsedUser);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(parsedUser));
      return { success: true, user: parsedUser };
    } catch (error) {
      const errorMessage = 'Google authentication failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const requestPasswordReset = async (email) => {
    try {
      setError(null);
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to send reset email';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const resetPassword = async (token, password, confirmPassword) => {
    try {
      setError(null);
      const response = await api.post('/auth/reset-password', { token, password, confirmPassword });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Password reset failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      setError(null);
      const response = await api.post('/auth/change-password', { currentPassword, newPassword });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to change password';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const forceChangePassword = async (newPassword) => {
    try {
      setError(null);
      const response = await api.post('/auth/force-password-change', { newPassword });
      if (response.data.success) {
        const updatedUser = { ...user, forcePasswordChange: false };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update password';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const refreshUser = async () => {
    setLoading(true);
    await verifyToken();
  };

  const signOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/signin';
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    verifyEmail,
    resendVerificationEmail,
    signInWithGoogle,
    handleGoogleCallback,
    requestPasswordReset,
    resetPassword,
    changePassword,
    forceChangePassword,
    refreshUser,
    api
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
