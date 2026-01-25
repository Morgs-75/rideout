import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, Loader2, Image, Fingerprint, Shield } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import AvatarPicker from '../components/AvatarPicker';
import { isBiometricAvailable, setBiometricLock, isBiometricLockEnabled } from '../components/BiometricLock';

const EditProfile = () => {
  const { user, userProfile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(userProfile?.avatar || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [bike, setBike] = useState(userProfile?.bike || '');
  const [loading, setLoading] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    // Check if biometrics are available on this device
    const checkBiometric = async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
      setBiometricEnabled(isBiometricLockEnabled());
    };
    checkBiometric();
  }, []);

  const handleBiometricToggle = async () => {
    if (!biometricEnabled) {
      // Enabling - test biometric first
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: 'RideOut', id: window.location.hostname },
            user: {
              id: new Uint8Array(16),
              name: 'rideout-user',
              displayName: 'RideOut User'
            },
            pubKeyCredParams: [
              { type: 'public-key', alg: -7 },
              { type: 'public-key', alg: -257 }
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required'
            },
            timeout: 60000
          }
        });

        setBiometricLock(true);
        setBiometricEnabled(true);
      } catch (err) {
        console.error('Biometric setup failed:', err);
        alert('Could not enable Face ID. Please try again.');
      }
    } else {
      // Disabling
      setBiometricLock(false);
      setBiometricEnabled(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleStandardAvatarSelect = (avatarUrl) => {
    setAvatar(null); // Clear any file upload
    setAvatarPreview(avatarUrl);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let avatarUrl = avatarPreview || userProfile?.avatar || '';

      // Only upload if it's a file (not a standard avatar URL)
      if (avatar) {
        const avatarRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${avatar.name}`);
        await uploadBytes(avatarRef, avatar);
        avatarUrl = await getDownloadURL(avatarRef);
      }

      await updateProfile({ avatar: avatarUrl, bio: bio.trim(), bike: bike.trim() });
      navigate(`/profile/${user.uid}`);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="sticky top-0 z-40 bg-dark-bg/95 backdrop-blur-lg border-b border-dark-border safe-top">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-white"><ArrowLeft size={24} /></button>
          <h1 className="font-semibold">Edit Profile</h1>
          <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-neon-blue text-dark-bg font-semibold rounded-lg disabled:opacity-50">
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Save'}
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-neon-blue to-neon-green p-0.5">
              <div className="w-full h-full rounded-full bg-dark-bg overflow-hidden flex items-center justify-center">
                {avatarPreview ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" /> : <span className="text-3xl font-bold text-neon-blue">{userProfile?.streetName?.charAt(0).toUpperCase()}</span>}
              </div>
            </div>
            <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 w-8 h-8 bg-neon-blue rounded-full flex items-center justify-center text-dark-bg"><Camera size={16} /></button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />

          {/* Avatar options */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-dark-card border border-dark-border rounded-xl text-sm text-white flex items-center gap-2 hover:border-neon-blue transition-all"
            >
              <Camera size={16} />
              Upload Photo
            </button>
            <button
              onClick={() => setShowAvatarPicker(true)}
              className="px-4 py-2 bg-dark-card border border-dark-border rounded-xl text-sm text-white flex items-center gap-2 hover:border-neon-green transition-all"
            >
              <Image size={16} />
              Choose Avatar
            </button>
          </div>
        </div>

        {/* Street Name (readonly) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">Street Name</label>
          <input type="text" value={userProfile?.streetName || ''} disabled className="w-full px-4 py-3 bg-dark-surface border border-dark-border rounded-xl text-gray-500 cursor-not-allowed" />
          <p className="text-xs text-gray-500 mt-1">Street names cannot be changed</p>
        </div>

        {/* Bio */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 150))} placeholder="Tell the crew about yourself..." rows={3} className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-blue transition-all resize-none" />
          <p className="text-xs text-gray-500 text-right mt-1">{bio.length}/150</p>
        </div>

        {/* Bike */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">Your Ride</label>
          <input type="text" value={bike} onChange={(e) => setBike(e.target.value)} placeholder="e.g. Sur-Ron X 2024" className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-blue transition-all" />
        </div>

        {/* Security Section */}
        <div className="border-t border-dark-border pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-neon-blue" />
            <h3 className="font-semibold text-white">Security</h3>
          </div>

          {/* Biometric Lock Toggle */}
          {biometricAvailable && (
            <div
              onClick={handleBiometricToggle}
              className="flex items-center justify-between p-4 bg-dark-card border border-dark-border rounded-xl cursor-pointer hover:border-neon-blue transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${biometricEnabled ? 'bg-neon-blue/20' : 'bg-dark-surface'}`}>
                  <Fingerprint size={20} className={biometricEnabled ? 'text-neon-blue' : 'text-gray-500'} />
                </div>
                <div>
                  <p className="font-medium text-white">Face ID / Touch ID</p>
                  <p className="text-xs text-gray-500">Unlock app with biometrics</p>
                </div>
              </div>
              <div className={`w-12 h-7 rounded-full p-1 transition-all ${biometricEnabled ? 'bg-neon-blue' : 'bg-dark-surface'}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${biometricEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
          )}

          {!biometricAvailable && (
            <div className="p-4 bg-dark-card border border-dark-border rounded-xl opacity-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-dark-surface flex items-center justify-center">
                  <Fingerprint size={20} className="text-gray-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-400">Face ID / Touch ID</p>
                  <p className="text-xs text-gray-500">Not available on this device</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Avatar Picker Modal */}
      <AvatarPicker
        isOpen={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
        onSelect={handleStandardAvatarSelect}
        currentAvatar={avatarPreview}
      />
    </div>
  );
};

export default EditProfile;
