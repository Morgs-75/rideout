// TrackRequestModal - Modal for selecting riders to track
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Navigation, Check, UserPlus, Clock, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import {
  sendTrackRequest,
  getSentPendingRequests,
  getActiveTracksAsTracker
} from '../services/trackService';

const TrackRequestModal = ({ isOpen, onClose, onRequestSent }) => {
  const { user, userProfile } = useAuth();
  const [mutualFollowers, setMutualFollowers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState(new Set());
  const [activelyTracking, setActivelyTracking] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState(null);

  // Fetch mutual followers and existing requests/tracks
  useEffect(() => {
    if (!isOpen || !user?.uid) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Get users I follow
        const followingQuery = query(
          collection(db, 'follows'),
          where('followerId', '==', user.uid)
        );
        const followingSnap = await getDocs(followingQuery);
        const followingIds = new Set(followingSnap.docs.map(d => d.data().followingId));

        // Get users who follow me
        const followersQuery = query(
          collection(db, 'follows'),
          where('followingId', '==', user.uid)
        );
        const followersSnap = await getDocs(followersQuery);
        const followerIds = new Set(followersSnap.docs.map(d => d.data().followerId));

        // Find mutual (intersection)
        const mutualIds = [...followingIds].filter(id => followerIds.has(id));

        // Fetch user profiles for mutuals
        const mutuals = [];
        for (const uid of mutualIds) {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            mutuals.push({
              id: uid,
              ...userDoc.data()
            });
          }
        }

        setMutualFollowers(mutuals);

        // Get pending requests
        const pending = await getSentPendingRequests(user.uid);
        setPendingRequests(new Set(pending.map(r => r.toUserId)));

        // Get active tracks
        const tracks = await getActiveTracksAsTracker(user.uid);
        setActivelyTracking(new Set(tracks.map(t => t.trackedId)));
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, user?.uid]);

  const handleSendRequest = async (targetUser) => {
    if (sendingTo || pendingRequests.has(targetUser.id) || activelyTracking.has(targetUser.id)) {
      return;
    }

    setSendingTo(targetUser.id);
    try {
      await sendTrackRequest(
        { uid: user.uid, streetName: userProfile?.streetName, avatar: userProfile?.avatar },
        targetUser.id,
        targetUser
      );

      // Update pending state
      setPendingRequests(prev => new Set([...prev, targetUser.id]));

      if (onRequestSent) {
        onRequestSent(targetUser);
      }
    } catch (error) {
      console.error('Error sending track request:', error);
      alert(error.message || 'Failed to send request');
    } finally {
      setSendingTo(null);
    }
  };

  // Filter by search
  const filteredFollowers = searchQuery.trim()
    ? mutualFollowers.filter(f =>
        f.streetName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : mutualFollowers;

  // Get status for each follower
  const getFollowerStatus = (followerId) => {
    if (activelyTracking.has(followerId)) return 'tracking';
    if (pendingRequests.has(followerId)) return 'pending';
    return 'none';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-dark-card rounded-t-3xl max-h-[80vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-dark-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center">
                <Navigation size={20} className="text-neon-green" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Track Riders</h2>
                <p className="text-gray-400 text-sm">
                  Send tracking requests
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-dark-surface transition-colors"
            >
              <X size={24} className="text-gray-400" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4">
            <div className="flex items-center bg-dark-surface rounded-xl px-4 py-3">
              <Search size={18} className="text-gray-400 mr-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search mutual followers..."
                className="bg-transparent text-white placeholder-gray-500 outline-none flex-1"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}>
                  <X size={16} className="text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Info Banner */}
          <div className="mx-4 mb-3 p-3 bg-neon-green/10 rounded-xl border border-neon-green/30">
            <p className="text-sm text-neon-green">
              Riders must approve your request before you can track their location.
            </p>
          </div>

          {/* Followers List */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-neon-green border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredFollowers.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus size={48} className="mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">
                  {searchQuery ? 'No matching followers found' : 'No mutual followers yet'}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Follow riders who follow you back to track them
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFollowers.map(follower => {
                  const status = getFollowerStatus(follower.id);
                  const isSending = sendingTo === follower.id;

                  return (
                    <div
                      key={follower.id}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                        status === 'tracking'
                          ? 'bg-neon-green/20 border border-neon-green/50'
                          : status === 'pending'
                          ? 'bg-yellow-500/10 border border-yellow-500/30'
                          : 'bg-dark-surface'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-blue to-neon-green flex items-center justify-center overflow-hidden">
                        {follower.avatar ? (
                          <img
                            src={follower.avatar}
                            alt={follower.streetName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xl">
                            {follower.streetName?.[0]?.toUpperCase() || '?'}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 text-left">
                        <p className="text-white font-medium">{follower.streetName}</p>
                        <p className="text-gray-400 text-sm">{follower.bike || 'Rider'}</p>
                      </div>

                      {/* Status/Action */}
                      {status === 'tracking' ? (
                        <div className="flex items-center gap-2 text-neon-green">
                          <Check size={18} />
                          <span className="text-sm font-medium">Tracking</span>
                        </div>
                      ) : status === 'pending' ? (
                        <div className="flex items-center gap-2 text-yellow-500">
                          <Clock size={18} />
                          <span className="text-sm font-medium">Pending</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(follower)}
                          disabled={isSending}
                          className="px-4 py-2 bg-neon-green text-dark-bg rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSending ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            'Track'
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="p-4 border-t border-dark-border">
            <button
              onClick={onClose}
              className="w-full py-4 bg-dark-surface text-white font-bold rounded-xl text-lg"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TrackRequestModal;
