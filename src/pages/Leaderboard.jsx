import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Crown, Users, Route, ChevronRight, Flame } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getLeaderboard, getUserPoints, initUserPoints } from '../services/pointsService';
import { GAMIFICATION_CONFIG, getTier, formatPoints } from '../config/gamification';

const Leaderboard = () => {
  const { user, userProfile } = useAuth();
  const [activeBoard, setActiveBoard] = useState('road_legends');
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [userPoints, setUserPoints] = useState(null);
  const [loading, setLoading] = useState(true);

  const boards = [
    { id: 'road_legends', name: 'Road Legends', icon: Trophy, color: 'text-yellow-400' },
    { id: 'local_kings', name: 'Local Kings', icon: Crown, color: 'text-purple-400' },
    { id: 'crew_builders', name: 'Crew Builders', icon: Users, color: 'text-blue-400' },
    { id: 'distance_earned', name: 'Distance', icon: Route, color: 'text-green-400' }
  ];

  useEffect(() => {
    fetchLeaderboard();
    if (user) fetchUserPoints();
  }, [activeBoard, user]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await getLeaderboard(activeBoard);
      setLeaderboard(data);

      // Find user's rank
      if (user) {
        const userIndex = data.findIndex(entry => entry.id === user.uid);
        setUserRank(userIndex !== -1 ? userIndex + 1 : null);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPoints = async () => {
    try {
      // Initialize points for user if they don't exist
      await initUserPoints(user.uid);
      const points = await getUserPoints(user.uid);
      setUserPoints(points);
    } catch (error) {
      console.error('Error fetching user points:', error);
      setUserPoints({ totalPoints: 0, lifetimePoints: 0, tier: 'Rider' });
    }
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return { bg: 'bg-yellow-500', text: '1st', emoji: '🥇' };
    if (rank === 2) return { bg: 'bg-gray-400', text: '2nd', emoji: '🥈' };
    if (rank === 3) return { bg: 'bg-amber-600', text: '3rd', emoji: '🥉' };
    return { bg: 'bg-dark-surface', text: `#${rank}`, emoji: null };
  };

  const getMetricValue = (entry) => {
    switch (activeBoard) {
      case 'road_legends':
        return `${formatPoints(entry.points)} pts`;
      case 'local_kings':
        return `${formatPoints(entry.points30d)} pts`;
      case 'crew_builders':
        return `${formatPoints(entry.crewScore)} score`;
      case 'distance_earned':
        return `${entry.weeklyKm} km`;
      default:
        return `${formatPoints(entry.points)} pts`;
    }
  };

  const tier = userPoints ? getTier(userPoints.lifetimePoints || 0) : GAMIFICATION_CONFIG.tiers[0];

  return (
    <div className="min-h-screen bg-dark-bg pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-bg/95 backdrop-blur-lg border-b border-dark-border safe-top">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="text-yellow-400" size={24} />
            Leaderboards
          </h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* User Stats Card */}
        {user && userPoints && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-dark-card to-dark-surface border border-dark-border"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-blue to-neon-green p-0.5">
                <div className="w-full h-full rounded-full bg-dark-bg overflow-hidden flex items-center justify-center">
                  {userProfile?.avatar ? (
                    <img src={userProfile.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">{tier.icon}</span>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg">{userProfile?.streetName}</p>
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
                  >
                    {tier.icon} {tier.name}
                  </span>
                  {userRank && (
                    <span className="text-sm text-gray-400">
                      Rank #{userRank}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-neon-green">
                  {formatPoints(userPoints.lifetimePoints || 0)}
                </p>
                <p className="text-xs text-gray-500">lifetime pts</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Board Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4">
          {boards.map((board) => {
            const Icon = board.icon;
            const isActive = activeBoard === board.id;
            return (
              <button
                key={board.id}
                onClick={() => setActiveBoard(board.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-neon-blue text-dark-bg font-semibold'
                    : 'bg-dark-card text-gray-400 border border-dark-border'
                }`}
              >
                <Icon size={16} className={isActive ? '' : board.color} />
                {board.name}
              </button>
            );
          })}
        </div>

        {/* Leaderboard List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 skeleton rounded-xl"></div>
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Trophy size={48} className="mx-auto mb-4 opacity-50" />
            <p>No riders on this leaderboard yet</p>
            <p className="text-sm mt-2">Start earning points to claim your spot!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, index) => {
              const rank = index + 1;
              const badge = getRankBadge(rank);
              const entryTier = getTier(entry.points);
              const isCurrentUser = entry.id === user?.uid;

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    to={`/profile/${entry.id}`}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isCurrentUser
                        ? 'bg-neon-blue/10 border border-neon-blue/30'
                        : 'bg-dark-card border border-dark-border hover:border-gray-600'
                    } ${rank <= 3 ? 'relative overflow-hidden' : ''}`}
                  >
                    {/* Top 3 glow effect */}
                    {rank <= 3 && (
                      <div
                        className="absolute inset-0 opacity-10"
                        style={{
                          background: rank === 1
                            ? 'linear-gradient(90deg, #FFD700, transparent)'
                            : rank === 2
                            ? 'linear-gradient(90deg, #C0C0C0, transparent)'
                            : 'linear-gradient(90deg, #CD7F32, transparent)'
                        }}
                      />
                    )}

                    {/* Rank */}
                    <div className={`w-10 h-10 rounded-full ${badge.bg} flex items-center justify-center font-bold text-sm relative z-10`}>
                      {badge.emoji || badge.text}
                    </div>

                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-blue to-neon-green p-0.5 relative z-10">
                      <div className="w-full h-full rounded-full bg-dark-bg overflow-hidden flex items-center justify-center">
                        {entry.avatar ? (
                          <img src={entry.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold text-neon-blue">
                            {entry.streetName?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 relative z-10">
                      <p className="font-semibold truncate">{entry.streetName}</p>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${entryTier.color}20`, color: entryTier.color }}
                        >
                          {entryTier.icon} {entry.tier}
                        </span>
                        {isCurrentUser && (
                          <span className="text-xs text-neon-blue">You</span>
                        )}
                      </div>
                    </div>

                    {/* Points */}
                    <div className="text-right relative z-10">
                      <p className="font-bold text-neon-green">{getMetricValue(entry)}</p>
                    </div>

                    <ChevronRight size={16} className="text-gray-500 relative z-10" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Tier Legend */}
        <div className="mt-8 p-4 bg-dark-card rounded-xl border border-dark-border">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Flame size={18} className="text-orange-400" />
            Tier Progression
          </h3>
          <div className="space-y-2">
            {GAMIFICATION_CONFIG.tiers.map((t) => (
              <div key={t.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span>{t.icon}</span>
                  <span style={{ color: t.color }}>{t.name}</span>
                </div>
                <span className="text-gray-500">
                  {formatPoints(t.min)}+ pts
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
