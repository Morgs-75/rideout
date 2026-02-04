// TrackApprovalCard - Card for approving/rejecting incoming track requests
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navigation, Check, X, Loader2 } from 'lucide-react';
import { approveTrackRequest, rejectTrackRequest } from '../services/trackService';

const TrackApprovalCard = ({ request, onResponse }) => {
  const [responding, setResponding] = useState(null); // 'approve' | 'reject' | null

  const handleApprove = async () => {
    if (responding) return;
    setResponding('approve');
    try {
      await approveTrackRequest(request.id);
      if (onResponse) onResponse('approved', request);
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request');
    } finally {
      setResponding(null);
    }
  };

  const handleReject = async () => {
    if (responding) return;
    setResponding('reject');
    try {
      await rejectTrackRequest(request.id);
      if (onResponse) onResponse('rejected', request);
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request');
    } finally {
      setResponding(null);
    }
  };

  // Format time ago
  const getTimeAgo = () => {
    if (!request.createdAt) return '';
    const date = request.createdAt.toDate?.() || new Date(request.createdAt);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-dark-surface rounded-xl p-4 border border-neon-green/30"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-blue to-neon-green flex items-center justify-center overflow-hidden">
            {request.fromAvatarUrl ? (
              <img
                src={request.fromAvatarUrl}
                alt={request.fromStreetName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-lg font-bold text-white">
                {request.fromStreetName?.[0]?.toUpperCase() || '?'}
              </span>
            )}
          </div>
          {/* Track icon badge */}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-neon-green rounded-full flex items-center justify-center">
            <Navigation size={12} className="text-dark-bg" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-white font-medium">{request.fromStreetName}</p>
            <span className="text-gray-500 text-xs">{getTimeAgo()}</span>
          </div>
          <p className="text-gray-400 text-sm mt-0.5">
            wants to track your location
          </p>

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleReject}
              disabled={responding !== null}
              className="flex-1 py-2 px-4 bg-dark-border text-gray-400 rounded-xl flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
            >
              {responding === 'reject' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <X size={16} />
                  Decline
                </>
              )}
            </button>
            <button
              onClick={handleApprove}
              disabled={responding !== null}
              className="flex-1 py-2 px-4 bg-neon-green text-dark-bg rounded-xl flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50"
            >
              {responding === 'approve' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Check size={16} />
                  Allow
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TrackApprovalCard;
