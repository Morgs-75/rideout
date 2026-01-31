// RateMyRide - Gallery of bikes to browse and rate
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Camera,
  X,
  Star,
  TrendingUp,
  Clock,
  Trophy,
  Image as ImageIcon
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BikeCard from '../components/BikeCard';
import {
  postBike,
  rateBike,
  deleteBike,
  getUserRating,
  subscribeToBikes,
  RATING_CATEGORIES
} from '../services/rateMyRideService';

const RateMyRide = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [showPostModal, setShowPostModal] = useState(false);
  const [userRatings, setUserRatings] = useState({});

  // Post form state
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [bikeName, setBikeName] = useState('');
  const [posting, setPosting] = useState(false);

  // Subscribe to bikes
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToBikes((bikesData) => {
      setBikes(bikesData);
      setLoading(false);
    }, sortBy);

    return () => unsubscribe();
  }, [sortBy]);

  // Fetch user's ratings for displayed bikes
  useEffect(() => {
    if (!user?.uid || bikes.length === 0) return;

    const fetchUserRatings = async () => {
      const ratings = {};
      for (const bike of bikes) {
        if (bike.uid !== user.uid) {
          const rating = await getUserRating(bike.id, user.uid);
          if (rating) {
            ratings[bike.id] = rating;
          }
        }
      }
      setUserRatings(ratings);
    };

    fetchUserRatings();
  }, [bikes, user?.uid]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async () => {
    if (!selectedImage || !user?.uid || !userProfile) return;

    setPosting(true);
    try {
      await postBike(
        user.uid,
        userProfile,
        selectedImage,
        caption,
        bikeName || userProfile.bike || 'My Ride'
      );

      // Reset form
      setSelectedImage(null);
      setImagePreview(null);
      setCaption('');
      setBikeName('');
      setShowPostModal(false);
    } catch (error) {
      console.error('Error posting bike:', error);
    } finally {
      setPosting(false);
    }
  };

  const handleRate = async (bikeId, ratings) => {
    if (!user?.uid) return;

    try {
      await rateBike(bikeId, user.uid, ratings);
      // Update local state
      setUserRatings(prev => ({
        ...prev,
        [bikeId]: { ratings }
      }));
    } catch (error) {
      console.error('Error rating bike:', error);
    }
  };

  const handleDelete = async (bikeId) => {
    if (!confirm('Delete this post?')) return;

    try {
      await deleteBike(bikeId);
    } catch (error) {
      console.error('Error deleting bike:', error);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-bg/95 backdrop-blur-lg border-b border-dark-border safe-top">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/feed"
              className="flex items-center gap-1 px-3 py-2 -ml-2 rounded-full bg-dark-card text-white"
              style={{ minHeight: '48px', WebkitTapHighlightColor: 'rgba(0,212,255,0.3)' }}
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">Back</span>
            </Link>
            <div>
              <h1 className="text-xl font-display tracking-wider">RATE MY RIDE</h1>
              <p className="text-gray-500 text-xs">Show off your setup</p>
            </div>
          </div>
          <button
            onClick={() => setShowPostModal(true)}
            className="p-3 bg-gradient-to-r from-neon-blue to-neon-green rounded-xl"
          >
            <Plus size={20} className="text-dark-bg" />
          </button>
        </div>
      </header>

      {/* Sort Tabs */}
      <div className="sticky top-16 z-30 bg-dark-bg border-b border-dark-border">
        <div className="max-w-lg mx-auto px-4 flex">
          <button
            onClick={() => setSortBy('newest')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium border-b-2 transition-colors ${
              sortBy === 'newest'
                ? 'text-neon-blue border-neon-blue'
                : 'text-gray-500 border-transparent'
            }`}
          >
            <Clock size={16} />
            Newest
          </button>
          <button
            onClick={() => setSortBy('topRated')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium border-b-2 transition-colors ${
              sortBy === 'topRated'
                ? 'text-neon-blue border-neon-blue'
                : 'text-gray-500 border-transparent'
            }`}
          >
            <Trophy size={16} />
            Top Rated
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-dark-card rounded-2xl overflow-hidden">
                <div className="aspect-square skeleton" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-1/2 skeleton rounded" />
                  <div className="h-3 w-3/4 skeleton rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : bikes.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-dark-card mx-auto mb-4 flex items-center justify-center">
              <Camera size={40} className="text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No rides yet</h3>
            <p className="text-gray-500 mb-6">Be the first to show off your setup!</p>
            <button
              onClick={() => setShowPostModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-green text-dark-bg font-bold rounded-xl"
            >
              Post Your Ride
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {bikes.map(bike => (
              <BikeCard
                key={bike.id}
                bike={bike}
                onRate={handleRate}
                onDelete={handleDelete}
                userRating={userRatings[bike.id]}
                isOwner={bike.uid === user?.uid}
                showFullRatings={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Post Modal */}
      <AnimatePresence>
        {showPostModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-border">
              <button onClick={() => setShowPostModal(false)}>
                <X size={24} className="text-white" />
              </button>
              <h2 className="text-white font-bold text-lg">Post Your Ride</h2>
              <button
                onClick={handlePost}
                disabled={!selectedImage || posting}
                className={`px-4 py-2 rounded-lg font-bold ${
                  selectedImage && !posting
                    ? 'bg-neon-blue text-dark-bg'
                    : 'bg-dark-surface text-gray-500'
                }`}
              >
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Image Upload */}
              <div className="mb-6">
                {imagePreview ? (
                  <div className="relative aspect-square rounded-2xl overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => {
                        setSelectedImage(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-3 right-3 p-2 bg-black/50 rounded-full"
                    >
                      <X size={20} className="text-white" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-square bg-dark-card border-2 border-dashed border-dark-border rounded-2xl flex flex-col items-center justify-center gap-3"
                  >
                    <div className="w-16 h-16 rounded-full bg-dark-surface flex items-center justify-center">
                      <ImageIcon size={32} className="text-gray-500" />
                    </div>
                    <span className="text-gray-400 font-medium">Tap to add photo</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              {/* Bike Name */}
              <div className="mb-4">
                <label className="text-gray-400 text-sm mb-2 block">Bike Name</label>
                <input
                  type="text"
                  value={bikeName}
                  onChange={(e) => setBikeName(e.target.value)}
                  placeholder={userProfile?.bike || 'e.g., Sur-Ron X 2024'}
                  className="w-full bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-neon-blue"
                />
              </div>

              {/* Caption */}
              <div className="mb-4">
                <label className="text-gray-400 text-sm mb-2 block">Caption (optional)</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Tell us about your setup..."
                  rows={3}
                  className="w-full bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-neon-blue resize-none"
                />
              </div>

              {/* Rating Categories Info */}
              <div className="bg-dark-card rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-3">Others will rate your ride on:</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(RATING_CATEGORIES).map(([key, cat]) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      <span>{cat.emoji}</span>
                      <span className="text-white">{cat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RateMyRide;
