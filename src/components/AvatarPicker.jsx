import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

// Standard avatars - SVG data URLs for rider-themed avatars
const STANDARD_AVATARS = [
  {
    id: 'rider-blue',
    name: 'Blue Rider',
    url: 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#0A0A0A"/><circle cx="50" cy="50" r="45" fill="#00D4FF"/><circle cx="50" cy="35" r="18" fill="#0A0A0A"/><path d="M25 75 Q50 55 75 75 Q75 90 50 90 Q25 90 25 75" fill="#0A0A0A"/></svg>`)
  },
  {
    id: 'rider-green',
    name: 'Green Rider',
    url: 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#0A0A0A"/><circle cx="50" cy="50" r="45" fill="#39FF14"/><circle cx="50" cy="35" r="18" fill="#0A0A0A"/><path d="M25 75 Q50 55 75 75 Q75 90 50 90 Q25 90 25 75" fill="#0A0A0A"/></svg>`)
  },
  {
    id: 'rider-orange',
    name: 'Orange Rider',
    url: 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#0A0A0A"/><circle cx="50" cy="50" r="45" fill="#FF6B00"/><circle cx="50" cy="35" r="18" fill="#0A0A0A"/><path d="M25 75 Q50 55 75 75 Q75 90 50 90 Q25 90 25 75" fill="#0A0A0A"/></svg>`)
  },
  {
    id: 'rider-purple',
    name: 'Purple Rider',
    url: 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#0A0A0A"/><circle cx="50" cy="50" r="45" fill="#A855F7"/><circle cx="50" cy="35" r="18" fill="#0A0A0A"/><path d="M25 75 Q50 55 75 75 Q75 90 50 90 Q25 90 25 75" fill="#0A0A0A"/></svg>`)
  },
  {
    id: 'rider-red',
    name: 'Red Rider',
    url: 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#0A0A0A"/><circle cx="50" cy="50" r="45" fill="#EF4444"/><circle cx="50" cy="35" r="18" fill="#0A0A0A"/><path d="M25 75 Q50 55 75 75 Q75 90 50 90 Q25 90 25 75" fill="#0A0A0A"/></svg>`)
  },
  {
    id: 'rider-yellow',
    name: 'Yellow Rider',
    url: 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#0A0A0A"/><circle cx="50" cy="50" r="45" fill="#FACC15"/><circle cx="50" cy="35" r="18" fill="#0A0A0A"/><path d="M25 75 Q50 55 75 75 Q75 90 50 90 Q25 90 25 75" fill="#0A0A0A"/></svg>`)
  },
  {
    id: 'helmet-blue',
    name: 'Blue Helmet',
    url: 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#1a1a2e"/><ellipse cx="50" cy="45" rx="35" ry="30" fill="#00D4FF"/><rect x="15" y="50" width="70" height="8" rx="4" fill="#0A0A0A"/><ellipse cx="50" cy="45" rx="25" ry="15" fill="#0A0A0A" opacity="0.3"/></svg>`)
  },
  {
    id: 'helmet-green',
    name: 'Green Helmet',
    url: 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#1a1a2e"/><ellipse cx="50" cy="45" rx="35" ry="30" fill="#39FF14"/><rect x="15" y="50" width="70" height="8" rx="4" fill="#0A0A0A"/><ellipse cx="50" cy="45" rx="25" ry="15" fill="#0A0A0A" opacity="0.3"/></svg>`)
  },
  {
    id: 'bolt-blue',
    name: 'Blue Bolt',
    url: 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#0A0A0A"/><circle cx="50" cy="50" r="45" stroke="#00D4FF" stroke-width="4" fill="none"/><path d="M55 20 L35 50 L48 50 L45 80 L65 45 L52 45 Z" fill="#00D4FF"/></svg>`)
  },
  {
    id: 'bolt-green',
    name: 'Green Bolt',
    url: 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#0A0A0A"/><circle cx="50" cy="50" r="45" stroke="#39FF14" stroke-width="4" fill="none"/><path d="M55 20 L35 50 L48 50 L45 80 L65 45 L52 45 Z" fill="#39FF14"/></svg>`)
  },
  {
    id: 'wheel-blue',
    name: 'Blue Wheel',
    url: 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#0A0A0A"/><circle cx="50" cy="50" r="40" stroke="#00D4FF" stroke-width="6" fill="none"/><circle cx="50" cy="50" r="15" fill="#00D4FF"/><line x1="50" y1="10" x2="50" y2="35" stroke="#00D4FF" stroke-width="3"/><line x1="50" y1="65" x2="50" y2="90" stroke="#00D4FF" stroke-width="3"/><line x1="10" y1="50" x2="35" y2="50" stroke="#00D4FF" stroke-width="3"/><line x1="65" y1="50" x2="90" y2="50" stroke="#00D4FF" stroke-width="3"/></svg>`)
  },
  {
    id: 'wheel-green',
    name: 'Green Wheel',
    url: 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#0A0A0A"/><circle cx="50" cy="50" r="40" stroke="#39FF14" stroke-width="6" fill="none"/><circle cx="50" cy="50" r="15" fill="#39FF14"/><line x1="50" y1="10" x2="50" y2="35" stroke="#39FF14" stroke-width="3"/><line x1="50" y1="65" x2="50" y2="90" stroke="#39FF14" stroke-width="3"/><line x1="10" y1="50" x2="35" y2="50" stroke="#39FF14" stroke-width="3"/><line x1="65" y1="50" x2="90" y2="50" stroke="#39FF14" stroke-width="3"/></svg>`)
  },
];

const AvatarPicker = ({ isOpen, onClose, onSelect, currentAvatar }) => {
  const [selected, setSelected] = useState(currentAvatar || null);

  if (!isOpen) return null;

  const handleSelect = () => {
    if (selected) {
      onSelect(selected);
      onClose();
    }
  };

  return (
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
        className="bg-dark-card border border-dark-border rounded-3xl p-6 w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Choose Avatar</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-white rounded-full hover:bg-dark-surface transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Avatar Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-4 gap-3">
            {STANDARD_AVATARS.map(avatar => (
              <button
                key={avatar.id}
                onClick={() => setSelected(avatar.url)}
                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                  selected === avatar.url
                    ? 'border-neon-blue scale-105 shadow-neon-blue'
                    : 'border-transparent hover:border-gray-600'
                }`}
              >
                <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
                {selected === avatar.url && (
                  <div className="absolute inset-0 bg-neon-blue/20 flex items-center justify-center">
                    <Check size={24} className="text-neon-blue" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-dark-border">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-dark-surface text-white font-medium rounded-xl hover:bg-dark-border transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={!selected}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-neon-blue to-neon-green text-dark-bg font-bold rounded-xl hover:shadow-neon-blue transition-all disabled:opacity-50"
          >
            Select
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export { STANDARD_AVATARS };
export default AvatarPicker;
