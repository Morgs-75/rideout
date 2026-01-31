// LiveRidePanel - Bottom panel for controlling LiveRide during a ride
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Square,
  Users,
  Navigation,
  Clock,
  Route,
  Radio,
  ChevronUp,
  ChevronDown,
  Globe,
  Lock
} from 'lucide-react';
import { formatDuration, formatDistance } from '../services/liveRideService';

const LiveRidePanel = ({
  ride,
  onPause,
  onResume,
  onEnd,
  onAddViewers,
  onTogglePublic,
  isMinimized = false,
  onToggleMinimize
}) => {
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time every second
  useEffect(() => {
    if (!ride || ride.status === 'paused') return;

    const startTime = ride.startedAt?.toDate?.() || new Date();

    const updateElapsed = () => {
      setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [ride, ride?.status]);

  if (!ride) return null;

  const isPaused = ride.status === 'paused';
  const viewerCount = ride.allowedViewers?.length || 0;
  const isPublic = ride.isPublic || false;

  // Format elapsed time as HH:MM:SS
  const formatElapsed = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleEndClick = () => {
    setShowEndConfirm(true);
  };

  const confirmEnd = () => {
    setShowEndConfirm(false);
    onEnd();
  };

  // Minimized view - just a pill with live indicator
  if (isMinimized) {
    return (
      <motion.button
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={onToggleMinimize}
        className="fixed bottom-24 left-4 right-4 z-20 bg-dark-card/95 backdrop-blur-lg rounded-full px-4 py-3 flex items-center justify-between shadow-xl border border-neon-blue/30"
      >
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="relative">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping" />
          </div>
          <span className="text-white font-medium">LiveRide Active</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-neon-blue font-mono">{formatElapsed(elapsedTime)}</span>
          <ChevronUp size={20} className="text-gray-400" />
        </div>
      </motion.button>
    );
  }

  return (
    <>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-20 bg-dark-card/95 backdrop-blur-lg rounded-t-3xl border-t border-dark-border shadow-2xl"
      >
        {/* Collapse handle */}
        <button
          onClick={onToggleMinimize}
          className="w-full flex justify-center pt-2 pb-1"
        >
          <div className="w-12 h-1 bg-dark-border rounded-full" />
        </button>

        {/* Live Status Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-4 h-4 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500'}`} />
              {!isPaused && (
                <div className="absolute inset-0 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-lg">
                  {isPaused ? 'Ride Paused' : 'LiveRide'}
                </span>
                {isPublic && (
                  <span className="text-xs px-2 py-0.5 bg-hot-orange/20 text-hot-orange rounded-full flex items-center gap-1">
                    <Globe size={10} />
                    PUBLIC
                  </span>
                )}
              </div>
              <span className="text-gray-400 text-sm">
                {isPublic ? 'Anyone can watch' : `${viewerCount} viewer${viewerCount !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>
          <button onClick={onToggleMinimize}>
            <ChevronDown size={24} className="text-gray-400" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          {/* Duration */}
          <div className="bg-dark-surface rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neon-blue/20 flex items-center justify-center">
              <Clock size={20} className="text-neon-blue" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Duration</p>
              <p className="text-white font-bold text-lg font-mono">
                {formatElapsed(elapsedTime)}
              </p>
            </div>
          </div>

          {/* Distance */}
          <div className="bg-dark-surface rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center">
              <Route size={20} className="text-neon-green" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Distance</p>
              <p className="text-white font-bold text-lg">
                {formatDistance(ride.totalDistanceKm || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 px-4 pb-4">
          {/* Public Toggle Button */}
          <button
            onClick={onTogglePublic}
            className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium ${
              isPublic
                ? 'bg-hot-orange/20 text-hot-orange'
                : 'bg-dark-surface text-gray-400'
            }`}
          >
            {isPublic ? <Globe size={18} /> : <Lock size={18} />}
          </button>

          {/* Add Viewers Button */}
          <button
            onClick={onAddViewers}
            className="flex-1 py-3 bg-dark-surface rounded-xl flex items-center justify-center gap-2 text-white font-medium"
          >
            <Users size={18} />
            <span>Viewers</span>
            {viewerCount > 0 && (
              <span className="bg-neon-blue text-dark-bg text-xs font-bold px-2 py-0.5 rounded-full">
                {viewerCount}
              </span>
            )}
          </button>

          {/* Pause/Resume Button */}
          <button
            onClick={isPaused ? onResume : onPause}
            className={`w-14 h-14 rounded-full flex items-center justify-center ${
              isPaused
                ? 'bg-neon-green text-dark-bg'
                : 'bg-yellow-500 text-dark-bg'
            }`}
          >
            {isPaused ? <Play size={24} /> : <Pause size={24} />}
          </button>

          {/* End Button */}
          <button
            onClick={handleEndClick}
            className="flex-1 py-3 bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center gap-2 font-medium"
          >
            <Square size={18} />
            <span>End</span>
          </button>
        </div>
      </motion.div>

      {/* End Confirmation Modal */}
      <AnimatePresence>
        {showEndConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowEndConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-card rounded-2xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <Square size={32} className="text-red-500" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">End LiveRide?</h3>
                <p className="text-gray-400">
                  Your ride will be marked as completed. Viewers will no longer see your path.
                </p>
              </div>

              {/* Stats Summary */}
              <div className="bg-dark-surface rounded-xl p-4 mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Duration</span>
                  <span className="text-white font-medium">{formatElapsed(elapsedTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Distance</span>
                  <span className="text-white font-medium">
                    {formatDistance(ride.totalDistanceKm || 0)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 py-3 bg-dark-surface text-white rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmEnd}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium"
                >
                  End Ride
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LiveRidePanel;
