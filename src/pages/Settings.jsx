import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Bell, Shield, HelpCircle, LogOut, ChevronRight, MapPin, Volume2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { signOut, userProfile } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Settings state from localStorage - default to ON
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const stored = localStorage.getItem('notificationsEnabled');
    return stored === null ? true : stored === 'true';
  });
  const [locationEnabled, setLocationEnabled] = useState(() => {
    const stored = localStorage.getItem('locationEnabled');
    return stored === null ? true : stored === 'true';
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem('soundEnabled');
    return stored === null ? true : stored === 'true';
  });

  // Request permissions on mount if enabled
  useEffect(() => {
    // Request notification permission if enabled
    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    // Request location permission if enabled
    if (locationEnabled && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(() => {}, () => {});
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('notificationsEnabled', notificationsEnabled.toString());
  }, [notificationsEnabled]);

  useEffect(() => {
    localStorage.setItem('locationEnabled', locationEnabled.toString());
  }, [locationEnabled]);

  useEffect(() => {
    localStorage.setItem('soundEnabled', soundEnabled.toString());
  }, [soundEnabled]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      // Request notification permission
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setNotificationsEnabled(true);
        } else {
          alert('Please enable notifications in your browser settings.');
        }
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

  const toggleLocation = async () => {
    if (!locationEnabled) {
      // Request location permission
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => {
            setLocationEnabled(true);
          },
          () => {
            alert('Please enable location in your browser settings.');
          }
        );
      }
    } else {
      setLocationEnabled(false);
    }
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  const ToggleSwitch = ({ enabled, onToggle }) => (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`w-12 h-7 rounded-full p-1 transition-all cursor-pointer ${
        enabled ? 'bg-neon-blue' : 'bg-dark-surface'
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="sticky top-0 z-40 bg-dark-bg/95 backdrop-blur-lg border-b border-dark-border safe-top">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-white"><ArrowLeft size={24} /></button>
          <h1 className="font-semibold">Settings</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Profile Card */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-4 mb-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-blue to-neon-green p-0.5">
            <div className="w-full h-full rounded-full bg-dark-bg overflow-hidden flex items-center justify-center">
              {userProfile?.avatar ? <img src={userProfile.avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-xl font-bold text-neon-blue">{userProfile?.streetName?.charAt(0).toUpperCase()}</span>}
            </div>
          </div>
          <div>
            <p className="font-semibold text-lg">{userProfile?.streetName}</p>
            <p className="text-sm text-gray-500">{userProfile?.bike || 'Electric Rider'}</p>
          </div>
        </div>

        {/* Account Section */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Account</h3>
          <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
            <button
              onClick={() => navigate('/edit-profile')}
              className="w-full flex items-center justify-between p-4 hover:bg-dark-surface transition-all border-b border-dark-border"
            >
              <div className="flex items-center gap-3">
                <User size={20} className="text-gray-400" />
                <span>Edit Profile</span>
              </div>
              <ChevronRight size={18} className="text-gray-500" />
            </button>

            <div className="flex items-center justify-between p-4 border-b border-dark-border">
              <div className="flex items-center gap-3">
                <Bell size={20} className="text-gray-400" />
                <div>
                  <span>Notifications</span>
                  <p className="text-xs text-gray-500">Push notifications for alerts</p>
                </div>
              </div>
              <ToggleSwitch enabled={notificationsEnabled} onToggle={toggleNotifications} />
            </div>

            <div className="flex items-center justify-between p-4 border-b border-dark-border">
              <div className="flex items-center gap-3">
                <MapPin size={20} className="text-gray-400" />
                <div>
                  <span>Location Sharing</span>
                  <p className="text-xs text-gray-500">Share location on map</p>
                </div>
              </div>
              <ToggleSwitch enabled={locationEnabled} onToggle={toggleLocation} />
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Volume2 size={20} className="text-gray-400" />
                <div>
                  <span>Alert Sounds</span>
                  <p className="text-xs text-gray-500">Siren for alerts</p>
                </div>
              </div>
              <ToggleSwitch enabled={soundEnabled} onToggle={toggleSound} />
            </div>
          </div>
        </div>

        {/* Privacy Section */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Privacy & Safety</h3>
          <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 hover:bg-dark-surface transition-all border-b border-dark-border">
              <div className="flex items-center gap-3">
                <Shield size={20} className="text-gray-400" />
                <span>Blocked Users</span>
              </div>
              <ChevronRight size={18} className="text-gray-500" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-dark-surface transition-all">
              <div className="flex items-center gap-3">
                <Shield size={20} className="text-gray-400" />
                <span>Privacy Settings</span>
              </div>
              <ChevronRight size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Support Section */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Support</h3>
          <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 hover:bg-dark-surface transition-all border-b border-dark-border">
              <div className="flex items-center gap-3">
                <HelpCircle size={20} className="text-gray-400" />
                <span>Help Center</span>
              </div>
              <ChevronRight size={18} className="text-gray-500" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-dark-surface transition-all">
              <div className="flex items-center gap-3">
                <HelpCircle size={20} className="text-gray-400" />
                <span>Report a Problem</span>
              </div>
              <ChevronRight size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Logout */}
        <button onClick={() => setShowLogoutConfirm(true)} className="w-full bg-dark-card border border-dark-border rounded-2xl p-4 flex items-center gap-3 text-red-500 hover:bg-red-500/10 transition-all">
          <LogOut size={20} />
          <span className="font-medium">Log Out</span>
        </button>

        {/* Version */}
        <p className="text-center text-xs text-gray-600 mt-8">RideOut v1.0.0</p>
      </div>

      {/* Logout Confirmation */}
      {showLogoutConfirm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowLogoutConfirm(false)}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-dark-card border border-dark-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-2">Log out?</h3>
            <p className="text-gray-500 text-sm mb-6">You'll need to log back in to access your account.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-dark-surface border border-dark-border rounded-xl font-semibold">Cancel</button>
              <button onClick={handleLogout} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold">Log Out</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default Settings;
