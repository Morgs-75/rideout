import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Flag, AlertTriangle, MessageSquare, Ban, HelpCircle, Check } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

const reportReasons = [
  { id: 'inappropriate', label: 'Inappropriate content', icon: AlertTriangle },
  { id: 'harassment', label: 'Harassment or bullying', icon: MessageSquare },
  { id: 'spam', label: 'Spam or misleading', icon: Ban },
  { id: 'other', label: 'Other', icon: HelpCircle }
];

const ReportModal = ({ post, comment, user: reportedUser, onClose }) => {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState(null);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const contentType = post ? 'post' : comment ? 'comment' : 'user';
  const contentId = post?.id || comment?.id || reportedUser?.id;

  const handleSubmit = async () => {
    if (!selectedReason || !user) return;
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: user.uid,
        contentType,
        contentId,
        reason: selectedReason,
        additionalInfo: additionalInfo.trim(),
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      setSubmitted(true);
      setTimeout(() => onClose(), 2000);
    } catch (error) {
      console.error('Error submitting report:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-dark-card border border-dark-border rounded-t-3xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <Flag size={20} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold">Report {contentType}</h3>
              <p className="text-xs text-gray-500">Help us keep RideOut safe</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {submitted ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-neon-green/20 mx-auto mb-4 flex items-center justify-center">
                <Check size={32} className="text-neon-green" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Report Submitted</h4>
              <p className="text-gray-500 text-sm">Thanks for keeping our community safe</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-400 mb-4">Why are you reporting this?</p>
              <div className="space-y-2 mb-4">
                {reportReasons.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => setSelectedReason(reason.id)}
                    className={`w-full p-4 rounded-xl border transition-all flex items-center gap-3 ${
                      selectedReason === reason.id
                        ? 'border-neon-blue bg-neon-blue/10'
                        : 'border-dark-border hover:border-gray-600'
                    }`}
                  >
                    <reason.icon size={20} className={selectedReason === reason.id ? 'text-neon-blue' : 'text-gray-500'} />
                    <span>{reason.label}</span>
                  </button>
                ))}
              </div>
              <textarea
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="Additional details (optional)"
                rows={3}
                className="w-full p-4 bg-dark-surface border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-blue transition-all resize-none text-sm"
              />
              <button
                onClick={handleSubmit}
                disabled={!selectedReason || loading}
                className="w-full mt-4 py-3 bg-red-500 text-white font-semibold rounded-xl disabled:opacity-50 hover:bg-red-600 transition-all"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ReportModal;
