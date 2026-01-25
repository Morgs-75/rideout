import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Share2, Copy, Check, ExternalLink } from 'lucide-react';

// Social platform icons as SVG components
const SnapchatIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M12.166 3c.796 0 3.495.223 4.769 3.073.426.953.323 2.59.239 3.904l-.014.209c-.02.308-.038.601-.038.768 0 .199.122.372.474.476a.87.87 0 0 1 .144.054c.658.286.87.584.87.876 0 .457-.469.676-1.016.876-.091.033-.182.063-.27.094-.493.171-.987.342-1.137.684a.623.623 0 0 0-.024.449c.377 1.014 1.062 1.926 1.932 2.573.347.259.729.472 1.133.636.322.13.662.305.662.603 0 .476-.693.717-1.058.817a6.636 6.636 0 0 1-1.181.209c-.149.017-.281.032-.388.055-.207.044-.343.127-.503.429-.2.378-.623 1.19-2.064 1.19-.279 0-.593-.041-.948-.123-1.096-.253-1.807-.528-3.001-.528-.161 0-.332.006-.515.019-1.116.08-1.765.405-2.82.632a3.375 3.375 0 0 1-.709.077c-1.462 0-1.864-.812-2.065-1.19-.16-.302-.296-.385-.503-.429a4.865 4.865 0 0 0-.388-.055 6.636 6.636 0 0 1-1.181-.209c-.365-.1-1.058-.341-1.058-.817 0-.298.34-.473.662-.603.404-.164.786-.377 1.133-.636.87-.647 1.555-1.559 1.932-2.573a.623.623 0 0 0-.024-.449c-.15-.342-.644-.513-1.137-.684a5.456 5.456 0 0 1-.27-.094c-.547-.2-1.016-.419-1.016-.876 0-.292.212-.59.87-.876a.87.87 0 0 1 .144-.054c.352-.104.474-.277.474-.476 0-.167-.018-.46-.038-.768l-.014-.209c-.084-1.314-.187-2.951.239-3.904C4.505 3.223 7.204 3 8 3h4.166z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

const ShareModal = ({ post, onClose }) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/post/${post.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareToSnapchat = () => {
    // Snapchat Creative Kit sharing
    // In production, use Snap Kit SDK: https://kit.snapchat.com/
    const snapUrl = `https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(shareUrl)}`;
    window.open(snapUrl, '_blank', 'width=600,height=600');
  };

  const shareToTikTok = () => {
    // TikTok doesn't have direct URL sharing, but we can open their upload page
    // In production, integrate TikTok's Share Kit: https://developers.tiktok.com/
    // For now, copy to clipboard and open TikTok
    navigator.clipboard.writeText(`Check out this ride on RideOut! 🏍️⚡ ${shareUrl} #RideOut #ElectricBike`);
    window.open('https://www.tiktok.com/upload', '_blank');
  };

  const shareToInstagram = () => {
    // Instagram doesn't allow direct posting via URL
    // Copy caption and open Instagram
    navigator.clipboard.writeText(`Check out this ride on RideOut! 🏍️⚡ ${shareUrl} #RideOut #ElectricBike #EBike`);
    window.open('https://www.instagram.com/', '_blank');
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this ride on RideOut!',
          text: post.caption || 'Epic electric ride 🏍️⚡',
          url: shareUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }
  };

  const socialPlatforms = [
    { name: 'Snapchat', icon: SnapchatIcon, color: 'bg-yellow-400', action: shareToSnapchat },
    { name: 'TikTok', icon: TikTokIcon, color: 'bg-black border border-white/20', action: shareToTikTok },
    { name: 'Instagram', icon: InstagramIcon, color: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400', action: shareToInstagram },
  ];

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
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neon-blue/20 flex items-center justify-center">
              <Share2 size={20} className="text-neon-blue" />
            </div>
            <div>
              <h3 className="font-semibold">Share Post</h3>
              <p className="text-xs text-gray-500">Share to your favorite platforms</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Social Platforms */}
        <div className="p-4">
          <p className="text-sm text-gray-400 mb-4">Push to social</p>
          <div className="flex justify-center gap-6 mb-6">
            {socialPlatforms.map((platform) => (
              <button
                key={platform.name}
                onClick={platform.action}
                className="flex flex-col items-center gap-2 group"
              >
                <div className={`w-14 h-14 rounded-2xl ${platform.color} flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg`}>
                  <platform.icon />
                </div>
                <span className="text-xs text-gray-400">{platform.name}</span>
              </button>
            ))}
          </div>

          {/* Copy Link */}
          <div className="border-t border-dark-border pt-4">
            <p className="text-sm text-gray-400 mb-3">Or copy link</p>
            <div className="flex gap-2">
              <div className="flex-1 bg-dark-surface border border-dark-border rounded-xl px-4 py-3 text-sm text-gray-400 truncate">
                {shareUrl}
              </div>
              <button
                onClick={handleCopyLink}
                className={`px-4 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                  copied 
                    ? 'bg-neon-green/20 text-neon-green' 
                    : 'bg-neon-blue text-dark-bg hover:bg-neon-blue/80'
                }`}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Native Share (Mobile) */}
          {navigator.share && (
            <button
              onClick={shareNative}
              className="w-full mt-4 py-3 bg-dark-surface border border-dark-border rounded-xl text-white font-medium flex items-center justify-center gap-2 hover:bg-dark-border transition-all"
            >
              <ExternalLink size={18} />
              More sharing options
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ShareModal;
