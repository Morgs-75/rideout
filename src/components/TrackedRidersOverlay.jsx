// TrackedRidersOverlay - Floating panel showing tracked riders on map
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, ChevronUp, ChevronDown, X, MapPin, Clock } from 'lucide-react';
import { formatTrackDistance, calculateDistanceKm, revokeTracking } from '../services/trackService';

const TrackedRidersOverlay = ({
  trackedRiders = [], // Array of { track, location } objects
  userLocation,
  onCenterOnRider,
  onStopTracking,
  currentUser
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [stoppingId, setStoppingId] = useState(null);

  // Calculate distance from user to each rider
  const ridersWithDistance = trackedRiders.map(({ track, location }) => {
    let distance = null;
    if (userLocation && location?.location) {
      const loc = location.location;
      distance = calculateDistanceKm(
        userLocation.lat,
        userLocation.lng,
        loc.latitude,
        loc.longitude
      );
    }
    return { track, location, distance };
  }).sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

  const handleStopTracking = async (track) => {
    if (stoppingId) return;
    setStoppingId(track.id);
    try {
      await revokeTracking(track.id, currentUser);
      if (onStopTracking) onStopTracking(track);
    } catch (error) {
      console.error('Error stopping tracking:', error);
    } finally {
      setStoppingId(null);
    }
  };

  const formatLastUpdate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate?.() || new Date(timestamp);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  if (trackedRiders.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="absolute bottom-24 left-4 z-30 max-w-[280px]"
    >
      <div className="bg-dark-card/95 backdrop-blur-lg rounded-2xl border border-neon-green/30 shadow-xl overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-3 border-b border-dark-border"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-neon-green/20 rounded-full flex items-center justify-center">
              <Navigation size={16} className="text-neon-green" />
            </div>
            <div className="text-left">
              <p className="text-white text-sm font-medium">Tracking</p>
              <p className="text-gray-400 text-xs">{trackedRiders.length} rider{trackedRiders.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronDown size={18} className="text-gray-400" />
          ) : (
            <ChevronUp size={18} className="text-gray-400" />
          )}
        </button>

        {/* Riders List */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="max-h-[200px] overflow-y-auto">
                {ridersWithDistance.map(({ track, location, distance }) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-2 p-2 border-b border-dark-border last:border-b-0 hover:bg-dark-surface/50 transition-colors"
                  >
                    {/* Avatar */}
                    <button
                      onClick={() => location && onCenterOnRider?.(location)}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center overflow-hidden flex-shrink-0"
                    >
                      {track.trackerAvatarUrl || location?.avatarUrl ? (
                        <img
                          src={track.trackerAvatarUrl || location?.avatarUrl}
                          alt={track.trackedStreetName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-bold text-white">
                          {track.trackedStreetName?.[0]?.toUpperCase() || '?'}
                        </span>
                      )}
                    </button>

                    {/* Info */}
                    <button
                      onClick={() => location && onCenterOnRider?.(location)}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className="text-white text-sm font-medium truncate">
                        {track.trackedStreetName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {distance !== null ? (
                          <span className="flex items-center gap-1">
                            <MapPin size={10} />
                            {formatTrackDistance(distance)}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {location?.lastUpdated
                              ? formatLastUpdate(location.lastUpdated)
                              : 'Offline'}
                          </span>
                        )}
                        {!location?.isOnline && (
                          <span className="text-yellow-500">Offline</span>
                        )}
                      </div>
                    </button>

                    {/* Stop button */}
                    <button
                      onClick={() => handleStopTracking(track)}
                      disabled={stoppingId === track.id}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default TrackedRidersOverlay;
