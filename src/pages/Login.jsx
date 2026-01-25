import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/feed');
    } catch (err) {
      setError(err.message || 'Failed to sign in. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-neon-blue/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-neon-green/10 rounded-full blur-3xl"></div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-12 relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col items-center mb-12"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neon-blue to-neon-green p-0.5 shadow-neon-blue">
            <div className="w-full h-full rounded-2xl bg-dark-bg flex items-center justify-center">
              <Zap size={40} className="text-neon-blue" fill="currentColor" />
            </div>
          </div>
          <h1 className="mt-4 text-4xl font-display tracking-wider neon-text">RIDEOUT</h1>
          <p className="mt-2 text-gray-500 text-sm">Welcome back, rider</p>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-5 max-w-sm mx-auto w-full"
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

          {/* Email */}
          <div className="relative">
            <Mail size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full pl-12 pr-4 py-4 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full pl-12 pr-12 py-4 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Forgot Password */}
          <div className="text-right">
            <button type="button" className="text-neon-blue text-sm hover:underline">
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-neon-blue to-neon-green text-dark-bg font-bold rounded-xl hover:shadow-neon-blue transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed btn-neon"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-dark-bg border-t-transparent rounded-full animate-spin"></div>
                Signing in...
              </span>
            ) : (
              'RIDE IN'
            )}
          </button>
        </motion.form>

        {/* Sign up link */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center text-gray-400"
        >
          New to the crew?{' '}
          <Link to="/signup" className="text-neon-blue font-semibold hover:underline">
            Join RideOut
          </Link>
        </motion.p>
      </div>
    </div>
  );
};

export default Login;
