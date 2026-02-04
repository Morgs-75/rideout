// TrackingManagement - Full page to manage tracking relationships
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Navigation, Users, Clock, X, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getActiveTracksAsTracker,
  getActiveTracksAsTracked,
  getPendingRequestsForUser,
  getSentPendingRequests,
  revokeTracking,
  removeTracker,
  cancelTrackRequest,
  approveTrackRequest,
  rejectTrackRequest
} from '../services/trackService';

const TrackingManagement = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('tracking'); // 'tracking' | 'trackers' | 'requests'
  const [tracking, setTracking] = useState([]);
  const [trackers, setTrackers] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Fetch all data
  useEffect(() => {
    if (!user?.uid) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [trackingData, trackersData, incoming, outgoing] = await Promise.all([
          getActiveTracksAsTracker(user.uid),
          getActiveTracksAsTracked(user.uid),
          getPendingRequestsForUser(user.uid),
          getSentPendingRequests(user.uid)
        ]);

        setTracking(trackingData);
        setTrackers(trackersData);
        setIncomingRequests(incoming);
        setOutgoingRequests(outgoing);
      } catch (error) {
        console.error('Error fetching tracking data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.uid]);

  const handleStopTracking = async (track) => {
    setActionLoading(track.id);
    try {
      await revokeTracking(track.id, { uid: user.uid, streetName: userProfile?.streetName, avatar: userProfile?.avatar });
      setTracking(prev => prev.filter(t => t.id !== track.id));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveTracker = async (track) => {
    setActionLoading(track.id);
    try {
      await removeTracker(track.id, { uid: user.uid, streetName: userProfile?.streetName, avatar: userProfile?.avatar });
      setTrackers(prev => prev.filter(t => t.id !== track.id));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelRequest = async (requestId) => {
    setActionLoading(requestId);
    try {
      await cancelTrackRequest(requestId);
      setOutgoingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveRequest = async (request) => {
    setActionLoading(request.id);
    try {
      await approveTrackRequest(request.id);
      setIncomingRequests(prev => prev.filter(r => r.id !== request.id));
      // Refresh trackers
      const trackersData = await getActiveTracksAsTracked(user.uid);
      setTrackers(trackersData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (request) => {
    setActionLoading(request.id);
    try {
      await rejectTrackRequest(request.id);
      setIncomingRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const tabs = [
    { id: 'tracking', label: 'Tracking', count: tracking.length, icon: Navigation },
    { id: 'trackers', label: 'Trackers', count: trackers.length, icon: Users },
    { id: 'requests', label: 'Requests', count: incomingRequests.length + outgoingRequests.length, icon: Clock }
  ];

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-bg/95 backdrop-blur-lg border-b border-dark-border safe-top">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-white">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-semibold">Tracking Management</h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex bg-dark-surface rounded-xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-neon-green text-dark-bg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-dark-bg/20' : 'bg-dark-border'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 pb-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-neon-green" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* Tracking Tab */}
            {activeTab === 'tracking' && (
              <motion.div
                key="tracking"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                {tracking.length === 0 ? (
                  <div className="text-center py-12">
                    <Navigation size={48} className="mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400">You're not tracking anyone</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Send tracking requests from the map
                    </p>
                  </div>
                ) : (
                  tracking.map(track => (
                    <div key={track.id} className="bg-dark-card border border-dark-border rounded-xl p-4 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center overflow-hidden">
                        {track.trackerAvatarUrl ? (
                          <img src={track.trackerAvatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold">{track.trackedStreetName?.[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{track.trackedStreetName}</p>
                        {track.isMutual && (
                          <p className="text-neon-green text-xs">Mutual tracking</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleStopTracking(track)}
                        disabled={actionLoading === track.id}
                        className="px-4 py-2 bg-dark-surface text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === track.id ? <Loader2 size={16} className="animate-spin" /> : 'Stop'}
                      </button>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {/* Trackers Tab */}
            {activeTab === 'trackers' && (
              <motion.div
                key="trackers"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                {trackers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users size={48} className="mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400">No one is tracking you</p>
                  </div>
                ) : (
                  trackers.map(track => (
                    <div key={track.id} className="bg-dark-card border border-dark-border rounded-xl p-4 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-blue to-neon-green flex items-center justify-center overflow-hidden">
                        {track.trackerAvatarUrl ? (
                          <img src={track.trackerAvatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold">{track.trackerStreetName?.[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{track.trackerStreetName}</p>
                        {track.isMutual && (
                          <p className="text-neon-green text-xs">Mutual tracking</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveTracker(track)}
                        disabled={actionLoading === track.id}
                        className="px-4 py-2 bg-dark-surface text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === track.id ? <Loader2 size={16} className="animate-spin" /> : 'Remove'}
                      </button>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <motion.div
                key="requests"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Incoming Requests */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Incoming Requests</h3>
                  {incomingRequests.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No pending requests</p>
                  ) : (
                    <div className="space-y-3">
                      {incomingRequests.map(request => (
                        <div key={request.id} className="bg-dark-card border border-neon-green/30 rounded-xl p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-blue to-neon-green flex items-center justify-center overflow-hidden">
                              {request.fromAvatarUrl ? (
                                <img src={request.fromAvatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="font-bold">{request.fromStreetName?.[0]?.toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <p className="text-white font-medium">{request.fromStreetName}</p>
                              <p className="text-gray-400 text-sm">wants to track you</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRejectRequest(request)}
                              disabled={actionLoading === request.id}
                              className="flex-1 py-2 bg-dark-surface text-gray-400 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {actionLoading === request.id ? <Loader2 size={14} className="animate-spin" /> : <><X size={14} /> Decline</>}
                            </button>
                            <button
                              onClick={() => handleApproveRequest(request)}
                              disabled={actionLoading === request.id}
                              className="flex-1 py-2 bg-neon-green text-dark-bg rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {actionLoading === request.id ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Allow</>}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Outgoing Requests */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Sent Requests</h3>
                  {outgoingRequests.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No pending requests</p>
                  ) : (
                    <div className="space-y-3">
                      {outgoingRequests.map(request => (
                        <div key={request.id} className="bg-dark-card border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-blue to-neon-green flex items-center justify-center overflow-hidden">
                            <span className="font-bold">{request.toStreetName?.[0]?.toUpperCase()}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium">{request.toStreetName}</p>
                            <p className="text-yellow-500 text-xs">Pending approval</p>
                          </div>
                          <button
                            onClick={() => handleCancelRequest(request.id)}
                            disabled={actionLoading === request.id}
                            className="px-4 py-2 bg-dark-surface text-gray-400 rounded-xl text-sm font-medium disabled:opacity-50"
                          >
                            {actionLoading === request.id ? <Loader2 size={16} className="animate-spin" /> : 'Cancel'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default TrackingManagement;
