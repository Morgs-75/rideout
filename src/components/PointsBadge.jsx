import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, TrendingUp } from 'lucide-react';
import { getUserPoints } from '../services/pointsService';
import { getTier, getProgressToNextTier, getNextTier, formatPoints } from '../config/gamification';

const PointsBadge = ({ userId, showProgress = false, size = 'md' }) => {
  const [points, setPoints] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchPoints();
    }
  }, [userId]);

  const fetchPoints = async () => {
    try {
      const data = await getUserPoints(userId);
      setPoints(data);
    } catch (error) {
      console.error('Error fetching points:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !points) {
    return (
      <div className={`animate-pulse ${size === 'sm' ? 'h-5 w-16' : 'h-8 w-24'} bg-dark-surface rounded-full`} />
    );
  }

  const tier = getTier(points.lifetimePoints || 0);
  const nextTier = getNextTier(points.lifetimePoints || 0);
  const progress = getProgressToNextTier(points.lifetimePoints || 0);

  if (size === 'sm') {
    return (
      <div
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
      >
        <span>{tier.icon}</span>
        <span>{tier.name}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Tier Badge */}
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full font-medium"
          style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
        >
          <span className="text-lg">{tier.icon}</span>
          <span>{tier.name}</span>
        </div>
        <div className="flex items-center gap-1 text-neon-green">
          <Zap size={16} />
          <span className="font-bold">{formatPoints(points.lifetimePoints || 0)}</span>
          <span className="text-xs text-gray-500">pts</span>
        </div>
      </div>

      {/* Progress Bar */}
      {showProgress && nextTier && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{tier.name}</span>
            <span>{nextTier.name}</span>
          </div>
          <div className="h-2 bg-dark-surface rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${tier.color}, ${nextTier.color})` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">
              {formatPoints(nextTier.min - (points.lifetimePoints || 0))} pts to next tier
            </span>
            <span className="text-gray-400 flex items-center gap-1">
              <TrendingUp size={12} />
              {progress}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PointsBadge;

// Points notification toast component
export const PointsToast = ({ amount, reason, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const getReasonText = (reason) => {
    const reasons = {
      register: 'Welcome bonus!',
      complete_profile: 'Profile completed!',
      first_post_24h: 'First post bonus!',
      post_created: 'New post!',
      like_received: 'Your post was liked!',
      upvote_received: 'Your post was upvoted!',
      comment_received: 'New comment on your post!',
      comment_given: 'Thanks for commenting!',
      group_ride_joined: 'Group ride joined!',
      ride_km_verified: 'Ride logged!',
      referral_level_1: 'Referral bonus!',
      referral_level_2: 'Crew bonus!',
      referral_level_3: 'Extended crew bonus!'
    };
    return reasons[reason] || 'Points earned!';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.8 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-green rounded-full shadow-lg"
      >
        <div className="flex items-center gap-2 text-dark-bg font-bold">
          <Zap size={18} />
          <span>+{amount} pts</span>
          <span className="text-sm font-normal opacity-80">
            {getReasonText(reason)}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
