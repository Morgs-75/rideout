import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, UserX, Unlock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getBlockedUsers, unblockUser } from '../services/blockService';

const BlockedUsers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);

  useEffect(() => {
    if (user) {
      fetchBlockedUsers();
    }
  }, [user]);

  const fetchBlockedUsers = async () => {
    try {
      const users = await getBlockedUsers(user.uid);
      setBlockedUsers(users);
    } catch (error) {
      // Error fetching blocked users
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockedUserId, streetName) => {
    setShowConfirm({ id: blockedUserId, name: streetName });
  };

  const confirmUnblock = async () => {
    if (!showConfirm) return;

    setUnblocking(showConfirm.id);
    try {
      await unblockUser(user.uid, showConfirm.id);
      setBlockedUsers(prev => prev.filter(b => b.user.id !== showConfirm.id));
    } catch (error) {
      // Error unblocking user
    } finally {
      setUnblocking(null);
      setShowConfirm(null);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="sticky top-0 z-40 bg-dark-bg/95 backdrop-blur-lg border-b border-dark-border safe-top">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-white">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-semibold">Blocked Users</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-dark-card border border-dark-border rounded-xl p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-dark-surface"></div>
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-dark-surface rounded mb-2"></div>
                    <div className="h-3 w-32 bg-dark-surface rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : blockedUsers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-dark-card rounded-full flex items-center justify-center mx-auto mb-4">
              <UserX size={40} className="text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No blocked users</h3>
            <p className="text-gray-500 text-sm">
              When you block someone, they won't be able to see your posts or message you.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-4">
              Blocked users can't see your posts, message you, or find your profile.
            </p>
            {blockedUsers.map(({ user: blockedUser, blockedAt }) => (
              <motion.div
                key={blockedUser.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="bg-dark-card border border-dark-border rounded-xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 p-0.5">
                    <div className="w-full h-full rounded-full bg-dark-bg overflow-hidden flex items-center justify-center">
                      {blockedUser.avatar ? (
                        <img src={blockedUser.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-gray-500">
                          {blockedUser.streetName?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{blockedUser.streetName}</p>
                    <p className="text-xs text-gray-500">
                      Blocked {blockedAt?.toDate ? new Date(blockedAt.toDate()).toLocaleDateString() : 'recently'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleUnblock(blockedUser.id, blockedUser.streetName)}
                    disabled={unblocking === blockedUser.id}
                    className="px-4 py-2 bg-dark-surface border border-dark-border rounded-xl text-sm font-medium hover:bg-dark-border transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {unblocking === blockedUser.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Unlock size={16} />
                        Unblock
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Unblock Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-dark-card border border-dark-border rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-neon-blue/20 flex items-center justify-center">
                  <AlertCircle size={20} className="text-neon-blue" />
                </div>
                <h3 className="text-lg font-semibold">Unblock {showConfirm.name}?</h3>
              </div>
              <p className="text-gray-500 text-sm mb-6">
                They will be able to see your posts and send you messages again. You can block them again anytime.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 py-3 bg-dark-surface border border-dark-border rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUnblock}
                  className="flex-1 py-3 bg-neon-blue text-dark-bg rounded-xl font-semibold"
                >
                  Unblock
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BlockedUsers;
