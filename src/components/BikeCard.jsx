// BikeCard - Display a bike post with ratings
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Eye, MessageCircle, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RATING_CATEGORIES } from '../services/rateMyRideService';

const BikeCard = ({
  bike,
  onRate,
  onDelete,
  userRating,
  isOwner = false,
  showFullRatings = false
}) => {
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [pendingRatings, setPendingRatings] = useState(
    userRating?.ratings || { style: 0, mods: 0, clean: 0, power: 0 }
  );

  const handleStarClick = (category, value) => {
    setPendingRatings(prev => ({ ...prev, [category]: value }));
  };

  const handleSubmitRating = () => {
    // Check if at least one category is rated
    const hasRating = Object.values(pendingRatings).some(v => v > 0);
    if (!hasRating) return;

    onRate(bike.id, pendingRatings);
    setShowRatingModal(false);
  };

  const renderStars = (value, interactive = false, category = null) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => interactive && category && handleStarClick(category, star)}
            disabled={!interactive}
            className={interactive ? 'cursor-pointer' : 'cursor-default'}
          >
            <Star
              size={interactive ? 24 : 14}
              className={star <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
            />
          </button>
        ))}
      </div>
    );
  };

  const timeAgo = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-card rounded-2xl overflow-hidden border border-dark-border"
      >
        {/* Image */}
        <div className="relative aspect-square">
          <img
            src={bike.imageUrl}
            alt={bike.bikeName}
            className="w-full h-full object-cover"
          />

          {/* Overall Rating Badge */}
          {bike.totalRatings > 0 && (
            <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
              <Star size={16} className="text-yellow-400 fill-yellow-400" />
              <span className="text-white font-bold">{bike.overallRating.toFixed(1)}</span>
            </div>
          )}

          {/* Delete button for owner */}
          {isOwner && onDelete && (
            <button
              onClick={() => onDelete(bike.id)}
              className="absolute top-3 left-3 bg-red-500/80 backdrop-blur-sm rounded-full p-2"
            >
              <Trash2 size={16} className="text-white" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* User Info */}
          <div className="flex items-center gap-3 mb-3">
            <Link to={`/profile/${bike.uid}`}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-blue to-neon-green flex items-center justify-center overflow-hidden">
                {bike.avatarUrl ? (
                  <img src={bike.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold">{bike.streetName?.[0]}</span>
                )}
              </div>
            </Link>
            <div className="flex-1">
              <Link to={`/profile/${bike.uid}`} className="text-white font-semibold hover:text-neon-blue">
                {bike.streetName}
              </Link>
              <p className="text-gray-500 text-xs">{timeAgo(bike.createdAt)}</p>
            </div>
          </div>

          {/* Bike Name & Caption */}
          <h3 className="text-white font-bold text-lg mb-1">{bike.bikeName}</h3>
          {bike.caption && (
            <p className="text-gray-400 text-sm mb-3">{bike.caption}</p>
          )}

          {/* Category Ratings */}
          {showFullRatings && bike.totalRatings > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {Object.entries(RATING_CATEGORIES).map(([key, cat]) => (
                <div key={key} className="flex items-center gap-2 bg-dark-surface rounded-lg px-2 py-1.5">
                  <span>{cat.emoji}</span>
                  <span className="text-gray-400 text-xs flex-1">{cat.label}</span>
                  <span className="text-white font-semibold text-sm">
                    {bike.ratings[key]?.avg?.toFixed(1) || '0.0'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Quick Stats */}
          <div className="flex items-center gap-4 text-gray-500 text-sm mb-3">
            <div className="flex items-center gap-1">
              <Star size={14} className="text-yellow-400" />
              <span>{bike.totalRatings} rating{bike.totalRatings !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye size={14} />
              <span>{bike.viewCount || 0} views</span>
            </div>
          </div>

          {/* Rate Button */}
          {!isOwner && (
            <button
              onClick={() => setShowRatingModal(true)}
              className="w-full py-3 bg-gradient-to-r from-neon-blue to-neon-green text-dark-bg font-bold rounded-xl"
            >
              {userRating ? 'Update Rating' : 'Rate This Ride'}
            </button>
          )}
        </div>
      </motion.div>

      {/* Rating Modal */}
      {showRatingModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowRatingModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-dark-card rounded-2xl p-6 max-w-sm w-full"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-xl mb-2 text-center">Rate This Ride</h3>
            <p className="text-gray-400 text-sm text-center mb-6">{bike.bikeName}</p>

            <div className="space-y-4 mb-6">
              {Object.entries(RATING_CATEGORIES).map(([key, cat]) => (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{cat.emoji}</span>
                    <span className="text-white font-medium">{cat.label}</span>
                  </div>
                  {renderStars(pendingRatings[key], true, key)}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRatingModal(false)}
                className="flex-1 py-3 bg-dark-surface text-gray-400 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRating}
                className="flex-1 py-3 bg-gradient-to-r from-neon-blue to-neon-green text-dark-bg font-bold rounded-xl"
              >
                Submit
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
};

export default BikeCard;
