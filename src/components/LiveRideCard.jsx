// LiveRideCard - Preview card when viewing someone else's live ride
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Route, Eye, EyeOff, Navigation, Globe } from 'lucide-react';
import { formatDuration, formatDistance } from '../services/liveRideService';

const LiveRideCard = ({
  ride,
  onViewOnMap,
  onStopWatching,
  isViewing = false
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time every second
  useEffect(() => {
    if (!ride) return;

    const startTime = ride.startedAt?.toDate?.() || new Date();

    const updateElapsed = () => {
      setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [ride]);

  if (!ride) return null;

  // Format elapsed time as HH:MM:SS or MM:SS
  const formatElapsed = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isPaused = ride.status === 'paused';
  const isPublic = ride.isPublic || false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`bg-dark-surface rounded-xl p-4 border ${
        isViewing ? 'border-neon-blue/50' : 'border-dark-border'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar */}
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-blue to-neon-green flex items-center justify-center overflow-hidden">
            {ride.avatarUrl ? (
              <img
                src={ride.avatarUrl}
                alt={ride.streetName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-lg font-bold text-white">
                {ride.streetName?.[0]?.toUpperCase() || '?'}
              </span>
            )}
          </div>
          {/* Live indicator */}
          <div className="absolute -top-1 -right-1">
            <div className={`w-4 h-4 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500'}`}>
              {!isPaused && (
                <div className="absolute inset-0 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75" />
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold">{ride.streetNameDisplay || ride.streetName}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              isPaused ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {isPaused ? 'PAUSED' : 'LIVE'}
            </span>
            {isPublic && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-hot-orange/20 text-hot-orange flex items-center gap-1">
                <Globe size={10} />
                PUBLIC
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm flex items-center gap-1">
            <MapPin size={12} />
            Riding now
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-neon-blue" />
          <span className="text-white font-mono">{formatElapsed(elapsedTime)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Route size={16} className="text-neon-green" />
          <span className="text-white">{formatDistance(ride.totalDistanceKm || 0)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {isViewing ? (
          <>
            <button
              onClick={onStopWatching}
              className="flex-1 py-2.5 bg-dark-border text-gray-400 rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
            >
              <EyeOff size={16} />
              Stop Watching
            </button>
            <button
              onClick={onViewOnMap}
              className="flex-1 py-2.5 bg-neon-blue text-dark-bg rounded-xl flex items-center justify-center gap-2 text-sm font-bold"
            >
              <Navigation size={16} />
              Center Map
            </button>
          </>
        ) : (
          <button
            onClick={onViewOnMap}
            className="flex-1 py-2.5 bg-gradient-to-r from-neon-blue to-neon-green text-dark-bg rounded-xl flex items-center justify-center gap-2 text-sm font-bold"
          >
            <Eye size={16} />
            View on Map
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default LiveRideCard;
