import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, MessageCircle, MapPin, Users, Lock, Globe, UserCheck, Check, Navigation } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

const PrivacySettings = () => {
  const { user, userProfile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Privacy settings with defaults
  const [settings, setSettings] = useState({
    profileVisibility: userProfile?.privacy?.profileVisibility || 'everyone',
    whoCanMessage: userProfile?.privacy?.whoCanMessage || 'everyone',
    showOnMap: userProfile?.privacy?.showOnMap ?? true,
    showActivityStatus: userProfile?.privacy?.showActivityStatus ?? true,
    allowTagging: userProfile?.privacy?.allowTagging ?? true,
    whoCanTrack: userProfile?.privacy?.whoCanTrack || 'followers',
    showTrackingStatus: userProfile?.privacy?.showTrackingStatus ?? true
  });

  useEffect(() => {
    if (userProfile?.privacy) {
      setSettings({
        profileVisibility: userProfile.privacy.profileVisibility || 'everyone',
        whoCanMessage: userProfile.privacy.whoCanMessage || 'everyone',
        showOnMap: userProfile.privacy.showOnMap ?? true,
        showActivityStatus: userProfile.privacy.showActivityStatus ?? true,
        allowTagging: userProfile.privacy.allowTagging ?? true,
        whoCanTrack: userProfile.privacy.whoCanTrack || 'followers',
        showTrackingStatus: userProfile.privacy.showTrackingStatus ?? true
      });
    }
  }, [userProfile]);

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile({ privacy: settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      // Error saving settings
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const ToggleSwitch = ({ enabled, onToggle }) => (
    <button
      onClick={onToggle}
      className={`w-12 h-7 rounded-full p-1 transition-all ${
        enabled ? 'bg-neon-blue' : 'bg-dark-surface'
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  const RadioOption = ({ value, currentValue, onChange, icon: Icon, label, description }) => (
    <button
      onClick={() => onChange(value)}
      className={`w-full p-4 rounded-xl border transition-all flex items-center gap-3 text-left ${
        currentValue === value
          ? 'border-neon-blue bg-neon-blue/10'
          : 'border-dark-border hover:border-gray-600'
      }`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        currentValue === value ? 'bg-neon-blue/20' : 'bg-dark-surface'
      }`}>
        <Icon size={20} className={currentValue === value ? 'text-neon-blue' : 'text-gray-500'} />
      </div>
      <div className="flex-1">
        <p className="font-medium">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      {currentValue === value && (
        <div className="w-6 h-6 rounded-full bg-neon-blue flex items-center justify-center">
          <Check size={14} className="text-dark-bg" />
        </div>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="sticky top-0 z-40 bg-dark-bg/95 backdrop-blur-lg border-b border-dark-border safe-top">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-white">
              <ArrowLeft size={24} />
            </button>
            <h1 className="font-semibold">Privacy Settings</h1>
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
              saved
                ? 'bg-neon-green/20 text-neon-green'
                : 'bg-neon-blue text-dark-bg hover:bg-neon-blue/80'
            }`}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-dark-bg border-t-transparent rounded-full animate-spin" />
            ) : saved ? (
              <span className="flex items-center gap-1"><Check size={16} /> Saved</span>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Profile Visibility */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
            <Eye size={14} />
            Profile Visibility
          </h3>
          <div className="space-y-2">
            <RadioOption
              value="everyone"
              currentValue={settings.profileVisibility}
              onChange={(v) => updateSetting('profileVisibility', v)}
              icon={Globe}
              label="Everyone"
              description="Anyone can see your profile and posts"
            />
            <RadioOption
              value="followers"
              currentValue={settings.profileVisibility}
              onChange={(v) => updateSetting('profileVisibility', v)}
              icon={UserCheck}
              label="Followers Only"
              description="Only people who follow you can see your posts"
            />
            <RadioOption
              privately="private"
              value="private"
              currentValue={settings.profileVisibility}
              onChange={(v) => updateSetting('profileVisibility', v)}
              icon={Lock}
              label="Private"
              description="Only you can see your posts (hidden from feed)"
            />
          </div>
        </div>

        {/* Who Can Message */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
            <MessageCircle size={14} />
            Who Can Message You
          </h3>
          <div className="space-y-2">
            <RadioOption
              value="everyone"
              currentValue={settings.whoCanMessage}
              onChange={(v) => updateSetting('whoCanMessage', v)}
              icon={Globe}
              label="Everyone"
              description="Anyone can send you a message"
            />
            <RadioOption
              value="followers"
              currentValue={settings.whoCanMessage}
              onChange={(v) => updateSetting('whoCanMessage', v)}
              icon={UserCheck}
              label="Followers Only"
              description="Only people who follow you can message"
            />
            <RadioOption
              value="none"
              currentValue={settings.whoCanMessage}
              onChange={(v) => updateSetting('whoCanMessage', v)}
              icon={Lock}
              label="No One"
              description="Disable direct messages"
            />
          </div>
        </div>

        {/* Who Can Track You */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
            <Navigation size={14} />
            Who Can Send Track Requests
          </h3>
          <div className="space-y-2">
            <RadioOption
              value="everyone"
              currentValue={settings.whoCanTrack}
              onChange={(v) => updateSetting('whoCanTrack', v)}
              icon={Globe}
              label="Everyone"
              description="Anyone can send you a tracking request"
            />
            <RadioOption
              value="followers"
              currentValue={settings.whoCanTrack}
              onChange={(v) => updateSetting('whoCanTrack', v)}
              icon={UserCheck}
              label="Mutual Followers"
              description="Only mutual followers can request to track you"
            />
            <RadioOption
              value="none"
              currentValue={settings.whoCanTrack}
              onChange={(v) => updateSetting('whoCanTrack', v)}
              icon={Lock}
              label="No One"
              description="Disable tracking requests completely"
            />
          </div>
        </div>

        {/* Toggle Settings */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
            <Users size={14} />
            Additional Privacy
          </h3>
          <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-dark-border">
              <div className="flex items-center gap-3">
                <MapPin size={20} className="text-gray-400" />
                <div>
                  <p className="font-medium">Show on Rider Map</p>
                  <p className="text-xs text-gray-500">Let others see your location on the map</p>
                </div>
              </div>
              <ToggleSwitch
                enabled={settings.showOnMap}
                onToggle={() => updateSetting('showOnMap', !settings.showOnMap)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border-b border-dark-border">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-neon-green" />
                <div>
                  <p className="font-medium">Activity Status</p>
                  <p className="text-xs text-gray-500">Show when you're online</p>
                </div>
              </div>
              <ToggleSwitch
                enabled={settings.showActivityStatus}
                onToggle={() => updateSetting('showActivityStatus', !settings.showActivityStatus)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border-b border-dark-border">
              <div className="flex items-center gap-3">
                <Users size={20} className="text-gray-400" />
                <div>
                  <p className="font-medium">Allow Tagging</p>
                  <p className="text-xs text-gray-500">Let others tag you in posts</p>
                </div>
              </div>
              <ToggleSwitch
                enabled={settings.allowTagging}
                onToggle={() => updateSetting('allowTagging', !settings.allowTagging)}
              />
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Navigation size={20} className="text-neon-green" />
                <div>
                  <p className="font-medium">Show Tracking Status</p>
                  <p className="text-xs text-gray-500">Let trackers see when you're online</p>
                </div>
              </div>
              <ToggleSwitch
                enabled={settings.showTrackingStatus}
                onToggle={() => updateSetting('showTrackingStatus', !settings.showTrackingStatus)}
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-600 text-center px-4">
          Your privacy matters. These settings control how others interact with you on RideOut.
        </p>
      </div>
    </div>
  );
};

export default PrivacySettings;
