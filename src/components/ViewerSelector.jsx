// ViewerSelector - Modal for selecting which mutual followers can view your LiveRide
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Users, Check, UserPlus } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

const ViewerSelector = ({
  isOpen,
  onClose,
  onConfirm,
  selectedViewers = [],
  title = 'Select Viewers'
}) => {
  const { user } = useAuth();
  const [mutualFollowers, setMutualFollowers] = useState([]);
  const [selected, setSelected] = useState(new Set(selectedViewers));
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch mutual followers
  useEffect(() => {
    if (!isOpen || !user?.uid) return;

    const fetchMutualFollowers = async () => {
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
      } catch (error) {
        console.error('Error fetching mutual followers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMutualFollowers();
  }, [isOpen, user?.uid]);

  // Reset selected when modal opens with new selectedViewers
  useEffect(() => {
    setSelected(new Set(selectedViewers));
  }, [selectedViewers, isOpen]);

  const toggleViewer = (uid) => {
    const newSelected = new Set(selected);
    if (newSelected.has(uid)) {
      newSelected.delete(uid);
    } else {
      newSelected.add(uid);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    setSelected(new Set(mutualFollowers.map(f => f.id)));
  };

  const clearAll = () => {
    setSelected(new Set());
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selected));
    onClose();
  };

  // Filter by search
  const filteredFollowers = searchQuery.trim()
    ? mutualFollowers.filter(f =>
        f.streetName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : mutualFollowers;

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
              <div className="w-10 h-10 rounded-full bg-neon-blue/20 flex items-center justify-center">
                <Users size={20} className="text-neon-blue" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">{title}</h2>
                <p className="text-gray-400 text-sm">
                  {selected.size} selected
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

          {/* Quick Actions */}
          <div className="flex gap-2 px-4 pb-3">
            <button
              onClick={selectAll}
              className="flex-1 py-2 px-4 bg-neon-blue/20 text-neon-blue rounded-xl text-sm font-medium"
            >
              Select All
            </button>
            <button
              onClick={clearAll}
              className="flex-1 py-2 px-4 bg-dark-surface text-gray-400 rounded-xl text-sm font-medium"
            >
              Clear All
            </button>
          </div>

          {/* Followers List */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredFollowers.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus size={48} className="mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">
                  {searchQuery ? 'No matching followers found' : 'No mutual followers yet'}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Follow riders who follow you back to share rides
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFollowers.map(follower => (
                  <button
                    key={follower.id}
                    onClick={() => toggleViewer(follower.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      selected.has(follower.id)
                        ? 'bg-neon-blue/20 border border-neon-blue/50'
                        : 'bg-dark-surface hover:bg-dark-surface/80'
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

                    {/* Checkbox */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        selected.has(follower.id)
                          ? 'bg-neon-blue'
                          : 'bg-dark-border'
                      }`}
                    >
                      {selected.has(follower.id) && (
                        <Check size={14} className="text-dark-bg" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Confirm Button */}
          <div className="p-4 border-t border-dark-border">
            <button
              onClick={handleConfirm}
              className="w-full py-4 bg-gradient-to-r from-neon-blue to-neon-green text-dark-bg font-bold rounded-xl text-lg"
            >
              {selected.size > 0
                ? `Share with ${selected.size} Viewer${selected.size > 1 ? 's' : ''}`
                : 'Continue Without Viewers'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ViewerSelector;
