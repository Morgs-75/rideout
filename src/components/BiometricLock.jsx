import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Zap, AlertCircle } from 'lucide-react';

const BiometricLock = ({ children }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    // Check if biometric is enabled
    const enabled = localStorage.getItem('biometricEnabled') === 'true';
    setBiometricEnabled(enabled);

    if (enabled) {
      // Lock on app load if biometric is enabled
      const lastActive = localStorage.getItem('lastActiveTime');
      const now = Date.now();

      // Lock if more than 1 minute has passed since last activity
      if (!lastActive || (now - parseInt(lastActive)) > 60000) {
        setIsLocked(true);
      }
    }

    // Handle visibility change (app going to background/foreground)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        localStorage.setItem('lastActiveTime', Date.now().toString());
      } else if (document.visibilityState === 'visible') {
        const enabled = localStorage.getItem('biometricEnabled') === 'true';
        if (enabled) {
          const lastActive = localStorage.getItem('lastActiveTime');
          const now = Date.now();
          // Lock if more than 1 minute has passed
          if (lastActive && (now - parseInt(lastActive)) > 60000) {
            setIsLocked(true);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const authenticate = async () => {
    setIsAuthenticating(true);
    setError('');

    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        throw new Error('Biometric authentication not supported on this device');
      }

      // Check if platform authenticator is available (Face ID, Touch ID, etc.)
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        throw new Error('No biometric authenticator available');
      }

      // Create a challenge for authentication
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      // Try to authenticate
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'RideOut',
            id: window.location.hostname
          },
          user: {
            id: new Uint8Array(16),
            name: 'rideout-user',
            displayName: 'RideOut User'
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },  // ES256
            { type: 'public-key', alg: -257 } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required'
          },
          timeout: 60000
        }
      });

      if (credential) {
        setIsLocked(false);
        localStorage.setItem('lastActiveTime', Date.now().toString());
      }
    } catch (err) {
      console.error('Biometric auth error:', err);

      if (err.name === 'NotAllowedError') {
        // User cancelled or failed authentication
        setError('Authentication cancelled. Tap to try again.');
      } else if (err.name === 'SecurityError') {
        // Security error - might need HTTPS
        setError('Security error. Make sure you\'re using HTTPS.');
      } else {
        setError(err.message || 'Authentication failed. Tap to try again.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const skipLock = () => {
    // Allow skip but disable biometric for this session
    setIsLocked(false);
    localStorage.setItem('lastActiveTime', Date.now().toString());
  };

  if (!isLocked) {
    return children;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] bg-dark-bg flex flex-col items-center justify-center p-6"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neon-blue to-neon-green p-0.5">
            <div className="w-full h-full rounded-2xl bg-dark-bg flex items-center justify-center">
              <Zap size={40} className="text-neon-blue" fill="currentColor" />
            </div>
          </div>
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-display tracking-wider mb-2"
        >
          RIDEOUT
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-gray-400 mb-12"
        >
          Unlock to continue
        </motion.p>

        {/* Biometric Button */}
        <motion.button
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4 }}
          onClick={authenticate}
          disabled={isAuthenticating}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-neon-blue to-neon-green p-0.5 mb-6"
        >
          <div className="w-full h-full rounded-full bg-dark-bg flex items-center justify-center">
            {isAuthenticating ? (
              <div className="w-10 h-10 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
            ) : (
              <Fingerprint size={48} className="text-neon-blue" />
            )}
          </div>
        </motion.button>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-gray-400 text-sm mb-4"
        >
          {isAuthenticating ? 'Authenticating...' : 'Tap to unlock with Face ID'}
        </motion.p>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-red-400 text-sm mb-4"
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}

        {/* Skip Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          onClick={skipLock}
          className="text-gray-500 text-sm hover:text-gray-400"
        >
          Enter password instead
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
};

export default BiometricLock;

// Utility function to check if biometrics are available
export const isBiometricAvailable = async () => {
  try {
    if (!window.PublicKeyCredential) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

// Utility function to enable/disable biometric lock
export const setBiometricLock = (enabled) => {
  localStorage.setItem('biometricEnabled', enabled.toString());
  if (enabled) {
    localStorage.setItem('lastActiveTime', Date.now().toString());
  }
};

// Utility function to check if biometric lock is enabled
export const isBiometricLockEnabled = () => {
  return localStorage.getItem('biometricEnabled') === 'true';
};
