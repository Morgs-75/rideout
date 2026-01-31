import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Type, Smile, Check, Trash2, Plus, Minus, Music, Play, Pause, Volume2 } from 'lucide-react';

// Popular emojis for quick access
const EMOJI_CATEGORIES = {
  'Popular': ['🔥', '⚡', '🏍️', '💨', '🚀', '💯', '🤙', '👊', '😎', '🔊', '🎵', '💪'],
  'Faces': ['😀', '😂', '🤣', '😍', '🥰', '😎', '🤩', '😤', '💀', '👻', '🤯', '😈'],
  'Objects': ['🏍️', '🛵', '🚲', '⚡', '🔥', '💨', '🌙', '⭐', '🌟', '💫', '🎸', '🎤'],
  'Symbols': ['💯', '🔥', '⚡', '💥', '💢', '❤️', '🖤', '💙', '💚', '🤍', '✨', '💫']
};

const TEXT_COLORS = [
  '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FF6600', '#00D4FF'
];

// Music tracks - royalty-free tracks
const MUSIC_TRACKS = [
  { id: 'none', name: 'No Music', artist: '', url: null, icon: '🔇' },
  { id: 'energy', name: 'High Energy', artist: 'RideOut Beats', genre: 'Electronic', icon: '⚡',
    url: 'https://cdn.pixabay.com/audio/2024/02/28/audio_5c4a01a911.mp3' },
  { id: 'chill', name: 'Chill Vibes', artist: 'RideOut Beats', genre: 'Lo-Fi', icon: '🌊',
    url: 'https://cdn.pixabay.com/audio/2024/03/11/audio_5eca43847a.mp3' },
  { id: 'hiphop', name: 'Street Flow', artist: 'RideOut Beats', genre: 'Hip Hop', icon: '🎤',
    url: 'https://cdn.pixabay.com/audio/2023/10/25/audio_14eac0b51e.mp3' },
  { id: 'epic', name: 'Epic Ride', artist: 'RideOut Beats', genre: 'Cinematic', icon: '🔥',
    url: 'https://cdn.pixabay.com/audio/2024/01/10/audio_bc5c868cb1.mp3' },
  { id: 'bass', name: 'Bass Drop', artist: 'RideOut Beats', genre: 'Dubstep', icon: '💥',
    url: 'https://cdn.pixabay.com/audio/2023/07/03/audio_e892847568.mp3' },
  { id: 'trap', name: 'Trap Mode', artist: 'RideOut Beats', genre: 'Trap', icon: '🎵',
    url: 'https://cdn.pixabay.com/audio/2023/12/21/audio_89de0b3e91.mp3' },
];

const FONTS = [
  { name: 'Bold', style: 'font-bold' },
  { name: 'Italic', style: 'italic' },
  { name: 'Normal', style: '' }
];

const MediaEditor = ({ mediaUrl, mediaType, onSave, onCancel }) => {
  const containerRef = useRef(null);
  const audioRef = useRef(null);
  const [elements, setElements] = useState([]); // {type: 'text'|'emoji', content, x, y, size, color, font}
  const [selectedElement, setSelectedElement] = useState(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState(MUSIC_TRACKS[0]);
  const [isPreviewingMusic, setIsPreviewingMusic] = useState(false);
  const [previewingTrackId, setPreviewingTrackId] = useState(null);
  const [newText, setNewText] = useState('');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textFont, setTextFont] = useState('font-bold');
  const [emojiCategory, setEmojiCategory] = useState('Popular');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Add text element
  const addText = () => {
    if (!newText.trim()) return;
    const newElement = {
      id: Date.now(),
      type: 'text',
      content: newText,
      x: 50, // percentage
      y: 50,
      size: 24,
      color: textColor,
      font: textFont
    };
    setElements([...elements, newElement]);
    setNewText('');
    setShowTextInput(false);
    setSelectedElement(newElement.id);
  };

  // Add emoji element
  const addEmoji = (emoji) => {
    const newElement = {
      id: Date.now(),
      type: 'emoji',
      content: emoji,
      x: 50,
      y: 50,
      size: 48
    };
    setElements([...elements, newElement]);
    setShowEmojiPicker(false);
    setSelectedElement(newElement.id);
  };

  // Delete selected element
  const deleteSelected = () => {
    if (selectedElement) {
      setElements(elements.filter(el => el.id !== selectedElement));
      setSelectedElement(null);
    }
  };

  // Update element size
  const updateSize = (delta) => {
    if (!selectedElement) return;
    setElements(elements.map(el => {
      if (el.id === selectedElement) {
        const newSize = Math.max(12, Math.min(120, el.size + delta));
        return { ...el, size: newSize };
      }
      return el;
    }));
  };

  // Preview music track
  const previewTrack = (track) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (previewingTrackId === track.id) {
      // Stop preview
      setPreviewingTrackId(null);
      setIsPreviewingMusic(false);
    } else if (track.url) {
      // Start preview
      audioRef.current = new Audio(track.url);
      audioRef.current.volume = 0.5;
      audioRef.current.play();
      setPreviewingTrackId(track.id);
      setIsPreviewingMusic(true);

      // Stop after 10 seconds
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause();
          setPreviewingTrackId(null);
          setIsPreviewingMusic(false);
        }
      }, 10000);
    }
  };

  // Select music track
  const selectTrack = (track) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setSelectedMusic(track);
    setPreviewingTrackId(null);
    setIsPreviewingMusic(false);
    setShowMusicPicker(false);
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Handle drag start
  const handleDragStart = (e, elementId) => {
    e.preventDefault();
    setSelectedElement(elementId);
    setIsDragging(true);

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const element = elements.find(el => el.id === elementId);
    if (element) {
      setDragOffset({
        x: clientX - (element.x / 100 * rect.width),
        y: clientY - (element.y / 100 * rect.height)
      });
    }
  };

  // Handle drag move
  const handleDragMove = (e) => {
    if (!isDragging || !selectedElement) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const newX = ((clientX - dragOffset.x) / rect.width) * 100;
    const newY = ((clientY - dragOffset.y) / rect.height) * 100;

    setElements(elements.map(el => {
      if (el.id === selectedElement) {
        return {
          ...el,
          x: Math.max(5, Math.min(95, newX)),
          y: Math.max(5, Math.min(95, newY))
        };
      }
      return el;
    }));
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Render elements to canvas and return blob
  const renderToCanvas = async () => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Include music data
      const musicData = selectedMusic.id !== 'none' ? {
        id: selectedMusic.id,
        name: selectedMusic.name,
        artist: selectedMusic.artist,
        url: selectedMusic.url,
        icon: selectedMusic.icon
      } : null;

      if (mediaType === 'video') {
        // For videos, return elements data to overlay on playback
        resolve({ type: 'overlay', elements, music: musicData });
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Draw elements
        elements.forEach(el => {
          const x = (el.x / 100) * canvas.width;
          const y = (el.y / 100) * canvas.height;

          if (el.type === 'text') {
            const fontSize = (el.size / 100) * canvas.width * 0.1;
            ctx.font = `${el.font === 'font-bold' ? 'bold' : el.font === 'italic' ? 'italic' : ''} ${fontSize}px system-ui, sans-serif`;
            ctx.fillStyle = el.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Add shadow for visibility
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.fillText(el.content, x, y);
            ctx.shadowColor = 'transparent';
          } else if (el.type === 'emoji') {
            const fontSize = (el.size / 100) * canvas.width * 0.15;
            ctx.font = `${fontSize}px system-ui`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(el.content, x, y);
          }
        });

        canvas.toBlob((blob) => {
          resolve({ type: 'image', blob, elements, music: musicData });
        }, 'image/jpeg', 0.9);
      };
      img.src = mediaUrl;
    });
  };

  // Handle save
  const handleSave = async () => {
    const result = await renderToCanvas();
    onSave(result);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 safe-top">
        <button onClick={onCancel} className="p-2 text-white">
          <X size={24} />
        </button>
        <h2 className="text-white font-bold">Edit</h2>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-neon-blue text-dark-bg font-bold rounded-xl"
        >
          Done
        </button>
      </div>

      {/* Media Preview with Elements */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden mx-4 rounded-2xl bg-dark-card"
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        onClick={() => setSelectedElement(null)}
      >
        {mediaType === 'video' ? (
          <video
            src={mediaUrl}
            className="w-full h-full object-contain"
            loop
            muted
            autoPlay
            playsInline
          />
        ) : (
          <img
            src={mediaUrl}
            alt="Preview"
            className="w-full h-full object-contain"
          />
        )}

        {/* Render Elements */}
        {elements.map(el => (
          <div
            key={el.id}
            className={`absolute cursor-move select-none ${
              selectedElement === el.id ? 'ring-2 ring-neon-blue ring-offset-2 ring-offset-transparent' : ''
            }`}
            style={{
              left: `${el.x}%`,
              top: `${el.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: el.type === 'emoji' ? `${el.size}px` : `${el.size}px`,
              color: el.color,
              textShadow: el.type === 'text' ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none'
            }}
            onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, el.id); }}
            onTouchStart={(e) => { e.stopPropagation(); handleDragStart(e, el.id); }}
            onClick={(e) => { e.stopPropagation(); setSelectedElement(el.id); }}
          >
            <span className={el.font || ''}>{el.content}</span>
          </div>
        ))}
      </div>

      {/* Element Controls (when selected) */}
      <AnimatePresence>
        {selectedElement && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="absolute bottom-32 left-4 right-4 flex justify-center gap-4"
          >
            <button
              onClick={() => updateSize(-4)}
              className="w-12 h-12 bg-dark-card rounded-full flex items-center justify-center text-white"
            >
              <Minus size={20} />
            </button>
            <button
              onClick={deleteSelected}
              className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white"
            >
              <Trash2 size={20} />
            </button>
            <button
              onClick={() => updateSize(4)}
              className="w-12 h-12 bg-dark-card rounded-full flex items-center justify-center text-white"
            >
              <Plus size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Music Indicator */}
      {selectedMusic.id !== 'none' && (
        <div className="absolute bottom-28 left-4 right-4">
          <div className="bg-dark-card/90 backdrop-blur rounded-xl px-4 py-2 flex items-center gap-3">
            <span className="text-2xl">{selectedMusic.icon}</span>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">{selectedMusic.name}</p>
              <p className="text-gray-400 text-xs">{selectedMusic.artist}</p>
            </div>
            <Volume2 size={18} className="text-neon-blue" />
          </div>
        </div>
      )}

      {/* Bottom Toolbar */}
      <div className="p-4 pb-8 safe-bottom">
        <div className="flex justify-center gap-6">
          <button
            onClick={() => { setShowTextInput(true); setShowEmojiPicker(false); setShowMusicPicker(false); }}
            className="flex flex-col items-center gap-1 text-white"
          >
            <div className="w-14 h-14 bg-dark-card rounded-2xl flex items-center justify-center">
              <Type size={24} />
            </div>
            <span className="text-xs">Text</span>
          </button>
          <button
            onClick={() => { setShowEmojiPicker(true); setShowTextInput(false); setShowMusicPicker(false); }}
            className="flex flex-col items-center gap-1 text-white"
          >
            <div className="w-14 h-14 bg-dark-card rounded-2xl flex items-center justify-center">
              <Smile size={24} />
            </div>
            <span className="text-xs">Emoji</span>
          </button>
          <button
            onClick={() => { setShowMusicPicker(true); setShowTextInput(false); setShowEmojiPicker(false); }}
            className="flex flex-col items-center gap-1 text-white"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selectedMusic.id !== 'none' ? 'bg-neon-blue' : 'bg-dark-card'}`}>
              <Music size={24} className={selectedMusic.id !== 'none' ? 'text-dark-bg' : ''} />
            </div>
            <span className="text-xs">Music</span>
          </button>
        </div>
      </div>

      {/* Text Input Modal */}
      <AnimatePresence>
        {showTextInput && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute bottom-0 left-0 right-0 bg-dark-card rounded-t-3xl p-6 pb-10"
          >
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setShowTextInput(false)} className="text-gray-400">Cancel</button>
              <span className="text-white font-bold">Add Text</span>
              <button onClick={addText} className="text-neon-blue font-bold">Add</button>
            </div>

            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Enter text..."
              autoFocus
              className="w-full p-4 bg-dark-surface rounded-xl text-white placeholder-gray-500 text-lg mb-4"
            />

            {/* Color Picker */}
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">Color</p>
              <div className="flex gap-2 flex-wrap">
                {TEXT_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setTextColor(color)}
                    className={`w-8 h-8 rounded-full border-2 ${textColor === color ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Font Style */}
            <div>
              <p className="text-sm text-gray-400 mb-2">Style</p>
              <div className="flex gap-2">
                {FONTS.map(font => (
                  <button
                    key={font.name}
                    onClick={() => setTextFont(font.style)}
                    className={`px-4 py-2 rounded-xl ${textFont === font.style ? 'bg-neon-blue text-dark-bg' : 'bg-dark-surface text-white'} ${font.style}`}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji Picker Modal */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute bottom-0 left-0 right-0 bg-dark-card rounded-t-3xl p-6 pb-10 max-h-[60vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setShowEmojiPicker(false)} className="text-gray-400">Cancel</button>
              <span className="text-white font-bold">Add Emoji</span>
              <div className="w-16"></div>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {Object.keys(EMOJI_CATEGORIES).map(cat => (
                <button
                  key={cat}
                  onClick={() => setEmojiCategory(cat)}
                  className={`px-3 py-1 rounded-full whitespace-nowrap ${
                    emojiCategory === cat ? 'bg-neon-blue text-dark-bg' : 'bg-dark-surface text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Emoji Grid */}
            <div className="grid grid-cols-6 gap-3">
              {EMOJI_CATEGORIES[emojiCategory].map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => addEmoji(emoji)}
                  className="w-12 h-12 text-3xl flex items-center justify-center hover:bg-dark-surface rounded-xl transition-all"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Music Picker Modal */}
      <AnimatePresence>
        {showMusicPicker && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute bottom-0 left-0 right-0 bg-dark-card rounded-t-3xl p-6 pb-10 max-h-[70vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => { setShowMusicPicker(false); if(audioRef.current) audioRef.current.pause(); setPreviewingTrackId(null); }} className="text-gray-400">Cancel</button>
              <span className="text-white font-bold">Add Music</span>
              <div className="w-16"></div>
            </div>

            {/* Music Tracks */}
            <div className="space-y-2">
              {MUSIC_TRACKS.map(track => (
                <div
                  key={track.id}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    selectedMusic.id === track.id ? 'bg-neon-blue/20 border border-neon-blue' : 'bg-dark-surface'
                  }`}
                >
                  {/* Play/Pause Button */}
                  {track.url ? (
                    <button
                      onClick={() => previewTrack(track)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        previewingTrackId === track.id ? 'bg-neon-blue text-dark-bg' : 'bg-dark-card text-white'
                      }`}
                    >
                      {previewingTrackId === track.id ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-dark-card flex items-center justify-center text-2xl">
                      {track.icon}
                    </div>
                  )}

                  {/* Track Info */}
                  <div className="flex-1" onClick={() => selectTrack(track)}>
                    <div className="flex items-center gap-2">
                      {track.url && <span className="text-lg">{track.icon}</span>}
                      <p className="text-white font-medium">{track.name}</p>
                    </div>
                    {track.artist && (
                      <p className="text-gray-400 text-sm">{track.artist} · {track.genre}</p>
                    )}
                  </div>

                  {/* Select Button */}
                  <button
                    onClick={() => selectTrack(track)}
                    className={`px-4 py-2 rounded-xl font-medium ${
                      selectedMusic.id === track.id
                        ? 'bg-neon-blue text-dark-bg'
                        : 'bg-dark-card text-white'
                    }`}
                  >
                    {selectedMusic.id === track.id ? <Check size={18} /> : 'Use'}
                  </button>
                </div>
              ))}
            </div>

            <p className="text-center text-gray-500 text-xs mt-4">
              Music provided royalty-free for RideOut posts
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MediaEditor;
