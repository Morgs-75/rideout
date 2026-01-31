import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Bike, FileText, ChevronRight, ChevronLeft, Check, Upload, Phone } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [bio, setBio] = useState('');
  const [bike, setBike] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFinish = async () => {
    setLoading(true);

    try {
      let avatarUrl = '';

      if (avatar) {
        const avatarRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${avatar.name}`);
        await uploadBytes(avatarRef, avatar);
        avatarUrl = await getDownloadURL(avatarRef);
      }

      await updateProfile({
        avatar: avatarUrl,
        bio: bio.trim(),
        bike: bike.trim(),
        phone: phone.trim()
      });

      navigate('/feed');
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: 'Add Your Avatar',
      subtitle: 'Show the crew who you are',
      icon: Camera
    },
    {
      title: 'Write Your Bio',
      subtitle: 'Tell us about yourself (keep it short)',
      icon: FileText
    },
    {
      title: 'Your Ride',
      subtitle: "What's your electric beast?",
      icon: Bike
    },
    {
      title: 'Your Mobile',
      subtitle: 'For ride alerts and notifications',
      icon: Phone
    }
  ];

  const currentStep = steps[step - 1];

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-neon-blue/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-hot-orange/10 rounded-full blur-3xl"></div>
      </div>

      {/* Progress */}
      <div className="px-6 pt-8 relative z-10">
        <div className="flex items-center justify-between mb-2">
          {steps.map((_, i) => (
            <div key={i} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i + 1 <= step
                    ? 'bg-gradient-to-r from-neon-blue to-neon-green text-dark-bg'
                    : 'bg-dark-card text-gray-500 border border-dark-border'
                }`}
              >
                {i + 1 < step ? <Check size={16} /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-all ${
                    i + 1 < step ? 'bg-neon-blue' : 'bg-dark-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <p className="text-gray-500 text-sm">Step {step} of {steps.length}</p>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 py-8 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-blue to-neon-green p-0.5 mx-auto mb-6">
              <div className="w-full h-full rounded-2xl bg-dark-bg flex items-center justify-center">
                <currentStep.icon size={32} className="text-neon-blue" />
              </div>
            </div>
            <h2 className="text-2xl font-display tracking-wide mb-2">{currentStep.title}</h2>
            <p className="text-gray-500">{currentStep.subtitle}</p>

            {/* Step Content */}
            <div className="mt-8 max-w-sm mx-auto">
              {step === 1 && (
                <div className="flex flex-col items-center">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-32 h-32 rounded-full bg-dark-card border-2 border-dashed border-dark-border hover:border-neon-blue cursor-pointer transition-all overflow-hidden flex items-center justify-center"
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <Upload size={32} className="text-gray-500" />
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 text-neon-blue text-sm font-medium"
                  >
                    {avatarPreview ? 'Change photo' : 'Upload photo'}
                  </button>
                  <p className="mt-2 text-xs text-gray-500">Optional - you can skip this</p>
                </div>
              )}

              {step === 2 && (
                <div>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 150))}
                    placeholder="Electric dreams and midnight rides..."
                    rows={3}
                    className="w-full p-4 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all resize-none"
                  />
                  <p className="mt-2 text-right text-xs text-gray-500">{bio.length}/150</p>
                </div>
              )}

              {step === 3 && (
                <div>
                  <input
                    type="text"
                    value={bike}
                    onChange={(e) => setBike(e.target.value)}
                    placeholder="e.g. Sur-Ron X 2024, Custom 72v build"
                    className="w-full p-4 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
                  />
                  <p className="mt-2 text-xs text-gray-500">Tell us about your electric ride</p>
                </div>
              )}

              {step === 4 && (
                <div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +44 7700 900000"
                    className="w-full p-4 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
                  />
                  <p className="mt-2 text-xs text-gray-500">We'll send you SMS alerts for rides and emergencies</p>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="px-6 pb-8 relative z-10">
        <div className="flex gap-3 max-w-sm mx-auto">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-4 bg-dark-card border border-dark-border rounded-xl text-white font-semibold flex items-center justify-center gap-2 hover:bg-dark-surface transition-all"
            >
              <ChevronLeft size={20} />
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (step < 4) {
                setStep(step + 1);
              } else {
                handleFinish();
              }
            }}
            disabled={loading}
            className="flex-1 py-4 bg-gradient-to-r from-neon-blue to-neon-green text-dark-bg font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-neon-blue transition-all disabled:opacity-50 btn-neon"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-dark-bg border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : step < 4 ? (
              <>
                Next
                <ChevronRight size={20} />
              </>
            ) : (
              <>
                <Check size={20} />
                Let's Ride!
              </>
            )}
          </button>
        </div>
        <button
          onClick={() => navigate('/feed')}
          className="w-full mt-4 text-gray-500 text-sm hover:text-gray-300"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
