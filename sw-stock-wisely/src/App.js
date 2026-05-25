import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Import pages
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import ForcePasswordChange from './pages/auth/ForcePasswordChange';
import EmailVerification from './components/auth/EmailVerification';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import AIAssistant from './pages/AIAssistant';
import AIForecasting from './pages/AIForecasting';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import StockAdjustments from './pages/StockAdjustments';
import Reports from './pages/Reports';
import InventoryReportPage from './pages/reports/InventoryReportPage';
import SalesReportPage from './pages/reports/SalesReportPage';
import SalesReturnsPage from './pages/reports/SalesReturnsPage';
import PurchaseReturnsPage from './pages/reports/PurchaseReturnsPage';
import FinancialReportPage from './pages/reports/FinancialReportPage';
import CustomerReportPage from './pages/reports/CustomerReportPage';
import PerformanceReportPage from './pages/reports/PerformanceReportPage';
import AnalyticsReportPage from './pages/reports/AnalyticsReportPage';
import Alerts from './pages/Alerts';
import Vendors from './pages/Vendors';
import VendorDetail from './pages/VendorDetail';
import Customers from './pages/Customers';
import NotificationSettings from './pages/NotificationSettings';
import NotificationHistory from './pages/NotificationHistory';
import Analytics from './pages/Analytics';
import VatReport from './pages/VatReport';
import Settings from './pages/Settings';
import GlobalToast from './components/ui/GlobalToast';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Force password change check - redirect ALL authenticated users who MUST change password
  // to the force-password-change page, unless they are already there.
  if (user?.forcePasswordChange && location.pathname !== '/force-password-change') {
    return <Navigate to="/force-password-change" replace />;
  }

  // Role check
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Public Route Component (redirect to dashboard if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

// Google OAuth Callback Handler
const GoogleCallback = () => {
  const { handleGoogleCallback } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const handleCallback = async () => {
      try {
        // Parse URL parameters
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        const userData = params.get('user');

        if (!token || !userData) {
          throw new Error('Missing token or user data');
        }

        const result = await handleGoogleCallback(token, userData);
        if (!isMounted) return;
        if (result.success) {
          navigate('/dashboard');
        } else {
          navigate('/signin?error=google_auth_failed');
        }
      } catch (error) {
        console.error('Google OAuth callback error:', error);
        navigate('/signin?error=google_auth_failed');
      }
    };

    handleCallback();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SidebarProvider>
          <Router>
            <div className="App">
              <GlobalToast />
              <Routes>
                {/* Authentication Routes */}
                <Route path="/signin" element={
                  <PublicRoute>
                    <SignIn />
                  </PublicRoute>
                } />
                <Route path="/signup" element={
                  <PublicRoute>
                    <SignUp />
                  </PublicRoute>
                } />
                <Route path="/forgot-password" element={
                  <PublicRoute>
                    <ForgotPassword />
                  </PublicRoute>
                } />
                <Route path="/reset-password" element={
                  <PublicRoute>
                    <ResetPassword />
                  </PublicRoute>
                } />
                <Route path="/verify-email" element={
                  <PublicRoute>
                    <EmailVerification />
                  </PublicRoute>
                } />
                <Route path="/force-password-change" element={
                  <ProtectedRoute>
                    <ForcePasswordChange />
                  </ProtectedRoute>
                } />
                <Route path="/auth/google/callback" element={<GoogleCallback />} />

                {/* Main Application Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/inventory" element={
                  <ProtectedRoute>
                    <Inventory />
                  </ProtectedRoute>
                } />
                <Route path="/sales" element={
                  <ProtectedRoute allowedRoles={['SALES_CLERK']}>
                    <Sales />
                  </ProtectedRoute>
                } />
                <Route path="/purchases" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                    <Purchases />
                  </ProtectedRoute>
                } />
                <Route path="/adjustments" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                    <StockAdjustments />
                  </ProtectedRoute>
                } />
                <Route path="/reports/vat" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                    <VatReport />
                  </ProtectedRoute>
                } />
                <Route path="/reports/inventory" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                    <InventoryReportPage />
                  </ProtectedRoute>
                } />
                <Route path="/reports/sales" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                    <SalesReportPage />
                  </ProtectedRoute>
                } />
                <Route path="/reports/returns" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                    <SalesReturnsPage />
                  </ProtectedRoute>
                } />
                <Route path="/reports/purchase-returns" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                    <PurchaseReturnsPage />
                  </ProtectedRoute>
                } />
                <Route path="/reports/financial" element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <FinancialReportPage />
                  </ProtectedRoute>
                } />
                <Route path="/reports/customer" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                    <CustomerReportPage />
                  </ProtectedRoute>
                } />
                <Route path="/reports/performance" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                    <PerformanceReportPage />
                  </ProtectedRoute>
                } />
                <Route path="/reports/analytics" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                    <AnalyticsReportPage />
                  </ProtectedRoute>
                } />
                <Route path="/reports/:reportType?" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                    <Reports />
                  </ProtectedRoute>
                } />
                <Route path="/customers" element={
                  <ProtectedRoute>
                    <Customers />
                  </ProtectedRoute>
                } />
                <Route path="/vendors" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                    <Vendors />
                  </ProtectedRoute>
                } />
                <Route path="/vendors/:id" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                    <VendorDetail />
                  </ProtectedRoute>
                } />
                <Route path="/alerts" element={
                  <ProtectedRoute>
                    <Alerts />
                  </ProtectedRoute>
                } />
                <Route path="/notifications/settings" element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <NotificationSettings />
                  </ProtectedRoute>
                } />
                <Route path="/notifications/history" element={
                  <ProtectedRoute>
                    <NotificationHistory />
                  </ProtectedRoute>
                } />
                <Route path="/ai-assistant" element={
                  <ProtectedRoute>
                    <AIAssistant />
                  </ProtectedRoute>
                } />
                <Route path="/ai-forecasting" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                    <AIForecasting />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/analytics" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                    <Analytics />
                  </ProtectedRoute>
                } />

                {/* Default redirect to signin if not authenticated */}
                <Route path="/" element={<Navigate to="/signin" replace />} />

                {/* Catch all route - redirect to signin */}
                <Route path="*" element={<Navigate to="/signin" replace />} />
              </Routes>
            </div>
          </Router>
        </SidebarProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
