import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, User, Building, Phone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp, signInWithGoogle } = useAuth();
  
  const password = watch('password');

  useEffect(() => {
    // Trigger animation after component mounts
    setAnimate(true);
  }, []);

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    
    try {
      const result = await signUp({
        firstName: data.ownerName?.split(' ')[0] || '',
        lastName: data.ownerName?.split(' ').slice(1).join(' ') || '',
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        businessName: data.businessName,
        // Do not send phoneNumber if not provided to satisfy optional validator
        businessType: 'retail'
      });
      
      if (result.success && result.requiresVerification) {
        // Navigate to email verification page
        navigate('/verify-email', { state: { email: data.email } });
      } else if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Brand Section - 40% */}
      <div className={`hidden lg:flex lg:w-2/5 bg-gradient-to-br from-gray-900 to-black relative overflow-hidden transition-all duration-1000 ease-in-out ${animate ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex flex-col justify-center items-center text-center p-12 z-10 relative">
          {/* Logo */}
          <div className={`mb-8 transform transition-all duration-700 delay-300 ${animate ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/50">
              <span className="text-3xl font-bold text-white">SW</span>
            </div>
          </div>
          
          {/* App Name */}
          <h1 className={`text-5xl font-bold text-white mb-4 transform transition-all duration-700 delay-500 ${animate ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            SW Stock Wisely
          </h1>
          
          {/* Tagline */}
          <p className={`text-xl text-gray-300 max-w-md leading-relaxed transform transition-all duration-700 delay-700 ${animate ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            Professional Inventory Management Made Simple
          </p>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full opacity-10 -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600 rounded-full opacity-10 -ml-40 -mb-40"></div>
          
          {/* Features List */}
          <div className="mt-8 text-left">
            <div className="space-y-3 text-gray-300">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
                <span>Free 30-day trial</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
                <span>24/7 customer support</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
                <span>Nepal VAT compliance</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-32 h-32 border border-white rounded-full"></div>
          <div className="absolute bottom-20 right-20 w-24 h-24 border border-white rounded-full"></div>
          <div className="absolute top-1/2 left-1/3 w-16 h-16 border border-white rounded-full"></div>
        </div>
      </div>

      {/* Right Form Section - 60% */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-8 lg:px-12">
        <div className={`w-full max-w-lg transform transition-all duration-1000 ${animate ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0'}`}>
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">SW</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">SW Stock Wisely</h2>
          </div>

          {/* Form Header */}
          <div className="text-center mb-8">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">Create your account</h2>
            <p className="text-lg text-gray-600 font-medium">Start managing your inventory efficiently</p>
          </div>

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Business Name Field */}
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
                Business Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('businessName', { 
                    required: 'Business name is required',
                    minLength: {
                      value: 2,
                      message: 'Business name must be at least 2 characters'
                    }
                  })}
                  type="text"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white/70 backdrop-blur placeholder-gray-400"
                  placeholder="Enter your business name"
                />
              </div>
              {errors.businessName && (
                <p className="mt-1 text-sm text-red-600">{errors.businessName.message}</p>
              )}
            </div>

            {/* Owner Name Field */}
            <div>
              <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700 mb-2">
                Owner Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('ownerName', { 
                    required: 'Owner name is required',
                    minLength: {
                      value: 2,
                      message: 'Owner name must be at least 2 characters'
                    }
                  })}
                  type="text"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white/70 backdrop-blur placeholder-gray-400"
                  placeholder="Enter your full name"
                />
              </div>
              {errors.ownerName && (
                <p className="mt-1 text-sm text-red-600">{errors.ownerName.message}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  type="email"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white/70 backdrop-blur placeholder-gray-400"
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('password', { 
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters'
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                      message: 'Password must contain uppercase, lowercase, and number'
                    }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white/70 backdrop-blur placeholder-gray-400"
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('confirmPassword', { 
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white/70 backdrop-blur placeholder-gray-400"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Terms Agreement */}
            <div className="flex items-start">
              <input
                {...register('terms', { required: 'You must agree to the terms' })}
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
              />
              <label className="ml-2 block text-sm text-gray-700">
                I agree to the{' '}
                <button type="button" className="text-indigo-600 hover:text-indigo-500">
                  Terms of Service
                </button>{' '}
                and{' '}
                <button type="button" className="text-indigo-600 hover:text-indigo-500">
                  Privacy Policy
                </button>
              </label>
            </div>
            {errors.terms && (
              <p className="mt-1 text-sm text-red-600">{errors.terms.message}</p>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-4 px-4 rounded-lg transition-all duration-300 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-lg shadow-lg transform hover:scale-[1.02] active:scale-[0.98] ${animate ? 'opacity-100' : 'opacity-0'}`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or sign up with</span>
              </div>
            </div>

            {/* Google Sign Up */}
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 border border-gray-300 rounded-lg transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign up with Google
            </button>

            {/* Sign In Link */}
            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/signin" className="text-indigo-600 hover:text-indigo-500 font-medium">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
