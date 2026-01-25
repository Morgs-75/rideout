import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { X, Share2, Copy, Check, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const InviteModal = ({ isOpen, onClose }) => {
  const { userProfile } = useAuth();
  const [copied, setCopied] = useState(false);

  const RIDEOUT_URL = 'https://rideout-crew.netlify.app';
  const inviteUrl = `${RIDEOUT_URL}?ref=${userProfile?.streetName || 'rider'}`;
  const inviteText = `Join me on RideOut - the app for electric bike riders! 🏍️⚡\n\n${inviteUrl}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join RideOut',
          text: inviteText,
          url: inviteUrl
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      handleCopy();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-dark-card border border-dark-border rounded-3xl p-6 w-full max-w-sm"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-blue to-neon-green flex items-center justify-center">
                <Users size={20} className="text-dark-bg" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Invite Riders</h2>
                <p className="text-xs text-gray-500">Scan to join RideOut</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-white rounded-full hover:bg-dark-surface transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* QR Code */}
          <div className="bg-white rounded-2xl p-6 mb-6">
            <QRCodeSVG
              value={inviteUrl}
              size={220}
              level="H"
              className="w-full h-auto"
              imageSettings={{
                src: "/icon.svg",
                height: 40,
                width: 40,
                excavate: true,
              }}
            />
          </div>

          {/* Invite message */}
          <div className="bg-dark-surface rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-400 text-center">
              {userProfile?.streetName || 'A rider'} invites you to join the crew!
            </p>
          </div>

          {/* URL display */}
          <div className="flex items-center gap-2 bg-dark-surface rounded-xl p-3 mb-6">
            <span className="flex-1 text-sm text-gray-400 truncate">{inviteUrl}</span>
            <button
              onClick={handleCopy}
              className="p-2 text-neon-blue hover:bg-neon-blue/20 rounded-lg transition-all"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 py-3 px-4 bg-dark-surface text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-dark-border transition-all"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-neon-blue to-neon-green text-dark-bg font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-neon-blue transition-all"
            >
              <Share2 size={18} />
              Share
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InviteModal;
