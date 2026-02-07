import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  Check,
  X,
  HelpCircle,
  ChevronRight,
  Zap,
  Route,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Ride announcements - starts empty, users create their own
const DEMO_RIDES = [];

const RideAnnouncements = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [rides, setRides] = useState(DEMO_RIDES);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [activeFilter, setActiveFilter] = useState('upcoming');

  // Create new ride
  const [newRide, setNewRide] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    meetingPoint: '',
    estimatedDistance: '',
    estimatedDuration: '',
    difficulty: 'Medium',
    maxRiders: 10
  });

  const handleCreateRide = () => {
    if (!newRide.title || !newRide.date || !newRide.time) return;

    const ride = {
      id: `ride-${Date.now()}`,
      ...newRide,
      organizer: { id: user?.uid, name: userProfile?.streetName || 'VoltRider', avatar: '' },
      responses: { going: [], maybe: [], declined: [] },
      comments: 0,
      createdAt: new Date().toISOString()
    };

    setRides(prev => [ride, ...prev]);
    setShowCreateModal(false);
    setNewRide({
      title: '',
      description: '',
      date: '',
      time: '',
      meetingPoint: '',
      estimatedDistance: '',
      estimatedDuration: '',
      difficulty: 'Medium',
      maxRiders: 10
    });
  };

  const handleResponse = (rideId, response) => {
    setRides(prev => prev.map(ride => {
      if (ride.id !== rideId) return ride;

      const userId = user?.uid || 'demo-user-123';
      const userName = userProfile?.streetName || 'VoltRider';
      const userObj = { id: userId, name: userName };

      // Remove from all lists first
      const newResponses = {
        going: ride.responses.going.filter(u => u.id !== userId),
        maybe: ride.responses.maybe.filter(u => u.id !== userId),
        declined: ride.responses.declined.filter(u => u.id !== userId)
      };

      // Add to appropriate list
      if (response === 'going') newResponses.going.push(userObj);
      else if (response === 'maybe') newResponses.maybe.push(userObj);
      else if (response === 'declined') newResponses.declined.push(userObj);

      return { ...ride, responses: newResponses };
    }));
  };

  const getUserResponse = (ride) => {
    const userId = user?.uid || 'demo-user-123';
    if (ride.responses.going.find(u => u.id === userId)) return 'going';
    if (ride.responses.maybe.find(u => u.id === userId)) return 'maybe';
    if (ride.responses.declined.find(u => u.id === userId)) return 'declined';
    return null;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-400 bg-green-400/20';
      case 'Medium': return 'text-yellow-400 bg-yellow-400/20';
      case 'Hard': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-bg/95 backdrop-blur-lg border-b border-dark-border">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-center mb-2">
            <h1 className="text-xl font-display tracking-wider">RIDEOUTS</h1>
          </div>

          {/* Condensed filter tabs */}
          <div className="flex items-center justify-center gap-1 mb-3">
            {[
              { key: 'upcoming', label: 'Soon' },
              { key: 'my rides', label: 'Mine' },
              { key: 'past', label: 'Past' }
            ].map(filter => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeFilter === filter.key
                    ? 'bg-neon-blue text-dark-bg'
                    : 'bg-dark-card text-gray-400'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Back and Add buttons row */}
          <div className="flex items-center justify-between">
            <Link
              to="/feed"
              className="flex items-center gap-2 px-4 py-3 bg-dark-card rounded-full text-gray-400 hover:text-white active:text-white touch-manipulation"
              style={{ minHeight: '48px', WebkitTapHighlightColor: 'rgba(0,212,255,0.3)' }}
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">Back</span>
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-3 bg-neon-green rounded-full"
            >
              <Plus size={20} className="text-dark-bg" />
            </button>
          </div>
        </div>
      </header>

      {/* Rides List */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {rides.map(ride => {
          const userResponse = getUserResponse(ride);
          const totalGoing = ride.responses.going.length;
          const spotsLeft = ride.maxRiders - totalGoing;

          return (
            <motion.div
              key={ride.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden"
            >
              {/* Ride Header */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">{ride.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span>by {ride.organizer.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getDifficultyColor(ride.difficulty)}`}>
                        {ride.difficulty}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-neon-blue font-bold">{formatDate(ride.date)}</p>
                    <p className="text-sm text-gray-400">{ride.time}</p>
                  </div>
                </div>

                <p className="text-gray-300 text-sm mb-4 line-clamp-2">{ride.description}</p>

                {/* Ride Details */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <MapPin size={16} className="text-neon-blue" />
                    <span className="truncate">{ride.meetingPoint}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Route size={16} className="text-neon-green" />
                    <span>{ride.estimatedDistance}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Clock size={16} className="text-hot-orange" />
                    <span>{ride.estimatedDuration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Users size={16} className="text-purple-400" />
                    <span>{totalGoing}/{ride.maxRiders} going</span>
                  </div>
                </div>

                {/* Attendees Preview */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="flex -space-x-2">
                      {ride.responses.going.slice(0, 5).map((attendee, i) => (
                        <div
                          key={attendee.id}
                          className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-blue to-neon-green flex items-center justify-center text-xs font-bold text-dark-bg border-2 border-dark-card"
                        >
                          {attendee.name[0]}
                        </div>
                      ))}
                      {totalGoing > 5 && (
                        <div className="w-8 h-8 rounded-full bg-dark-surface flex items-center justify-center text-xs text-gray-400 border-2 border-dark-card">
                          +{totalGoing - 5}
                        </div>
                      )}
                    </div>
                    {spotsLeft > 0 && spotsLeft <= 3 && (
                      <span className="ml-3 text-xs text-hot-orange">Only {spotsLeft} spots left!</span>
                    )}
                  </div>
                  <button className="flex items-center gap-1 text-sm text-gray-400">
                    <MessageCircle size={16} />
                    {ride.comments}
                  </button>
                </div>

                {/* Response Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResponse(ride.id, 'going')}
                    className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                      userResponse === 'going'
                        ? 'bg-neon-green text-dark-bg'
                        : 'bg-dark-surface text-gray-400 hover:bg-neon-green/20 hover:text-neon-green'
                    }`}
                  >
                    <Check size={18} />
                    Going
                  </button>
                  <button
                    onClick={() => handleResponse(ride.id, 'maybe')}
                    className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                      userResponse === 'maybe'
                        ? 'bg-yellow-500 text-dark-bg'
                        : 'bg-dark-surface text-gray-400 hover:bg-yellow-500/20 hover:text-yellow-500'
                    }`}
                  >
                    <HelpCircle size={18} />
                    Maybe
                  </button>
                  <button
                    onClick={() => handleResponse(ride.id, 'declined')}
                    className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                      userResponse === 'declined'
                        ? 'bg-red-500 text-white'
                        : 'bg-dark-surface text-gray-400 hover:bg-red-500/20 hover:text-red-500'
                    }`}
                  >
                    <X size={18} />
                    Can't
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {rides.length === 0 && (
          <div className="text-center py-12">
            <Zap size={48} className="mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-semibold mb-2">No rides planned</h3>
            <p className="text-gray-500 mb-4">Be the first to organize a RideOut!</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-neon-blue text-dark-bg font-bold rounded-xl"
            >
              Create RideOut
            </button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-end"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-h-[90vh] bg-dark-card rounded-t-3xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-dark-card border-b border-dark-border p-4 flex items-center justify-between">
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400">
                  Cancel
                </button>
                <h3 className="font-bold">Create RideOut</h3>
                <button
                  onClick={handleCreateRide}
                  disabled={!newRide.title || !newRide.date || !newRide.time}
                  className={`font-bold ${newRide.title && newRide.date && newRide.time ? 'text-neon-blue' : 'text-gray-600'}`}
                >
                  Post
                </button>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-60px)]">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Title *</label>
                  <input
                    type="text"
                    value={newRide.title}
                    onChange={e => setNewRide(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Night City Loop"
                    className="w-full p-3 bg-dark-surface border border-dark-border rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Description</label>
                  <textarea
                    value={newRide.description}
                    onChange={e => setNewRide(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Tell riders what to expect..."
                    rows={3}
                    className="w-full p-3 bg-dark-surface border border-dark-border rounded-xl text-white resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Date *</label>
                    <input
                      type="date"
                      value={newRide.date}
                      onChange={e => setNewRide(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full p-3 bg-dark-surface border border-dark-border rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Time *</label>
                    <input
                      type="time"
                      value={newRide.time}
                      onChange={e => setNewRide(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full p-3 bg-dark-surface border border-dark-border rounded-xl text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Meeting Point</label>
                  <input
                    type="text"
                    value={newRide.meetingPoint}
                    onChange={e => setNewRide(prev => ({ ...prev, meetingPoint: e.target.value }))}
                    placeholder="Where should riders meet?"
                    className="w-full p-3 bg-dark-surface border border-dark-border rounded-xl text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Distance</label>
                    <input
                      type="text"
                      value={newRide.estimatedDistance}
                      onChange={e => setNewRide(prev => ({ ...prev, estimatedDistance: e.target.value }))}
                      placeholder="e.g., 25 km"
                      className="w-full p-3 bg-dark-surface border border-dark-border rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Duration</label>
                    <input
                      type="text"
                      value={newRide.estimatedDuration}
                      onChange={e => setNewRide(prev => ({ ...prev, estimatedDuration: e.target.value }))}
                      placeholder="e.g., 2 hours"
                      className="w-full p-3 bg-dark-surface border border-dark-border rounded-xl text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Difficulty</label>
                    <select
                      value={newRide.difficulty}
                      onChange={e => setNewRide(prev => ({ ...prev, difficulty: e.target.value }))}
                      className="w-full p-3 bg-dark-surface border border-dark-border rounded-xl text-white"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Max Riders</label>
                    <input
                      type="number"
                      value={newRide.maxRiders}
                      onChange={e => setNewRide(prev => ({ ...prev, maxRiders: parseInt(e.target.value) || 10 }))}
                      min={2}
                      max={50}
                      className="w-full p-3 bg-dark-surface border border-dark-border rounded-xl text-white"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RideAnnouncements;
