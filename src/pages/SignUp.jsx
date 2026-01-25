import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Mail, Lock, Eye, EyeOff, AlertCircle, AtSign, Check, X } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [streetName, setStreetName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingName, setCheckingName] = useState(false);
  const [nameAvailable, setNameAvailable] = useState(null);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const checkStreetName = async (name) => {
    if (name.length < 3) {
      setNameAvailable(null);
      return;
    }

    setCheckingName(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('streetNameLower', '==', name.toLowerCase())
      );
      const snapshot = await getDocs(q);
      setNameAvailable(snapshot.empty);
    } catch (err) {
      console.error('Error checking name:', err);
      // If Firestore query fails, assume name is available to not block signup
      setNameAvailable(true);
      setError('Could not verify name availability, but you can try signing up.');
    } finally {
      setCheckingName(false);
    }
  };

  const handleStreetNameChange = (e) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
    setStreetName(value);
    if (value.length >= 3) {
      checkStreetName(value);
    } else {
      setNameAvailable(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (streetName.length < 3) {
      setError('Street name must be at least 3 characters');
      return;
    }

    if (nameAvailable === false) {
      setError('This street name is already taken');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      console.log('Starting signup with:', { email, streetName });
      await signUp(email, password, streetName);
      console.log('Signup successful, navigating to onboarding');
      navigate('/onboarding');
    } catch (err) {
      console.error('Signup error:', err);
      // Better error messages for common Firebase errors
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Try signing in.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 characters.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password sign-in is not enabled. Contact admin.');
      } else {
        setError(err.message || 'Failed to create account');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-neon-green/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-hot-orange/10 rounded-full blur-3xl"></div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-8 relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-green to-hot-orange p-0.5 shadow-neon-green">
            <div className="w-full h-full rounded-2xl bg-dark-bg flex items-center justify-center">
              <Zap size={32} className="text-neon-green" fill="currentColor" />
            </div>
          </div>
          <h1 className="mt-3 text-3xl font-display tracking-wider">JOIN THE CREW</h1>
          <p className="mt-1 text-gray-500 text-sm">Create your rider identity</p>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-4 max-w-sm mx-auto w-full"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
            >
              <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Street Name */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Choose your Street Name
            </label>
            <div className="relative">
              <AtSign size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={streetName}
                onChange={handleStreetNameChange}
                placeholder="e.g. VoltRider99"
                required
                maxLength={20}
                className="w-full pl-12 pr-12 py-4 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-green focus:ring-1 focus:ring-neon-green transition-all"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                {checkingName && (
                  <div className="w-5 h-5 border-2 border-neon-blue border-t-transparent rounded-full animate-spin"></div>
                )}
                {!checkingName && nameAvailable === true && (
                  <Check size={20} className="text-neon-green" />
                )}
                {!checkingName && nameAvailable === false && (
                  <X size={20} className="text-red-500" />
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {streetName.length}/20 characters • Letters, numbers, and underscores only
            </p>
          </div>

          {/* Email */}
          <div className="relative">
            <Mail size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full pl-12 pr-4 py-4 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-green focus:ring-1 focus:ring-neon-green transition-all"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              required
              className="w-full pl-12 pr-12 py-4 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-green focus:ring-1 focus:ring-neon-green transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <Lock size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              required
              className="w-full pl-12 pr-4 py-4 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-green focus:ring-1 focus:ring-neon-green transition-all"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-neon-green to-hot-orange text-dark-bg font-bold rounded-xl hover:shadow-neon-green transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed btn-neon mt-6"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-dark-bg border-t-transparent rounded-full animate-spin"></div>
                Creating...
              </span>
            ) : (
              'CREATE ACCOUNT'
            )}
          </button>
        </motion.form>

        {/* Sign in link */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-center text-gray-400"
        >
          Already riding?{' '}
          <Link to="/login" className="text-neon-green font-semibold hover:underline">
            Sign in
          </Link>
        </motion.p>
      </div>
    </div>
  );
};

export default SignUp;
