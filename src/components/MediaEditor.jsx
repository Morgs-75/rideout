import { useState, useRef, useEffect } from 'react';
import { X, Type, Smile, Check, Trash2, Plus, Minus, Music, Play, Pause, Volume2, Search, Loader2 } from 'lucide-react';
import { getTrendingTracks, getViralTracks, searchTracks, isSpotifyConfigured } from '../services/spotifyService';

// Popular emojis for quick access
const EMOJI_LIST = ['🔥', '⚡', '🏍️', '💨', '🚀', '💯', '🤙', '👊', '😎', '🔊', '🎵', '💪', '😀', '😂', '🤣', '😍', '🥰', '🤩', '😤', '💀', '👻', '🤯', '😈', '❤️', '🖤', '💙', '✨'];

const TEXT_COLORS = [
  '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FF6600', '#00D4FF'
];

// Fallback royalty-free tracks (used when Spotify not configured)
const FALLBACK_TRACKS = {
  'Trending': [
    { id: 'f1', name: 'Viral Energy', artist: 'RideOut Beats', icon: '🔥', url: 'https://cdn.pixabay.com/audio/2024/02/28/audio_5c4a01a911.mp3' },
    { id: 'f2', name: 'Main Character', artist: 'TrendSound', icon: '✨', url: 'https://cdn.pixabay.com/audio/2024/01/10/audio_bc5c868cb1.mp3' },
    { id: 'f3', name: 'Going Up', artist: 'ChartToppers', icon: '📈', url: 'https://cdn.pixabay.com/audio/2023/10/25/audio_14eac0b51e.mp3' },
  ],
  'Hip Hop': [
    { id: 'h1', name: 'Street Dreams', artist: 'Urban Beats', icon: '🎤', url: 'https://cdn.pixabay.com/audio/2023/10/25/audio_14eac0b51e.mp3' },
    { id: 'h2', name: 'Drip Mode', artist: 'Bass Kings', icon: '💧', url: 'https://cdn.pixabay.com/audio/2023/07/03/audio_e892847568.mp3' },
    { id: 'h3', name: 'No Cap', artist: 'Real Ones', icon: '🧢', url: 'https://cdn.pixabay.com/audio/2023/12/21/audio_89de0b3e91.mp3' },
  ],
  'Electronic': [
    { id: 'e1', name: 'Night Drive', artist: 'Synth Wave', icon: '🌃', url: 'https://cdn.pixabay.com/audio/2024/02/28/audio_5c4a01a911.mp3' },
    { id: 'e2', name: 'Bass Drop', artist: 'EDM Kings', icon: '💥', url: 'https://cdn.pixabay.com/audio/2023/07/03/audio_e892847568.mp3' },
    { id: 'e3', name: 'Rave Energy', artist: 'Club Hits', icon: '⚡', url: 'https://cdn.pixabay.com/audio/2024/01/10/audio_bc5c868cb1.mp3' },
  ],
  'Chill': [
    { id: 'c1', name: 'Sunset Vibes', artist: 'Lo-Fi Dreams', icon: '🌅', url: 'https://cdn.pixabay.com/audio/2024/03/11/audio_5eca43847a.mp3' },
    { id: 'c2', name: 'Easy Riding', artist: 'Mellow Beats', icon: '🌊', url: 'https://cdn.pixabay.com/audio/2024/03/11/audio_5eca43847a.mp3' },
  ],
};

const MediaEditor = ({ mediaUrl, mediaType, initialPanel, onSave, onCancel }) => {
  const containerRef = useRef(null);
  const audioRef = useRef(null);
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [activePanel, setActivePanel] = useState(initialPanel || null); // 'text', 'stickers', 'music'
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [musicCategory, setMusicCategory] = useState('Trending');
  const [musicTracks, setMusicTracks] = useState(FALLBACK_TRACKS);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [spotifyEnabled, setSpotifyEnabled] = useState(false);
  const [previewingTrackId, setPreviewingTrackId] = useState(null);
  const [newText, setNewText] = useState('');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Check if Spotify is configured and load tracks
  useEffect(() => {
    const loadSpotifyTracks = async () => {
      if (isSpotifyConfigured()) {
        setSpotifyEnabled(true);
        setIsLoadingTracks(true);
        try {
          const [trending, viral] = await Promise.all([
            getTrendingTracks(),
            getViralTracks()
          ]);
          if (trending || viral) {
            setMusicTracks({
              'Trending': trending || FALLBACK_TRACKS['Trending'],
              'Viral': viral || [],
              ...FALLBACK_TRACKS
            });
          }
        } catch (e) {
          console.error('Failed to load Spotify tracks:', e);
        }
        setIsLoadingTracks(false);
      }
    };
    loadSpotifyTracks();
  }, []);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim() || !spotifyEnabled) return;
    setIsSearching(true);
    try {
      const results = await searchTracks(searchQuery);
      setSearchResults(results || []);
    } catch (e) {
      console.error('Search failed:', e);
    }
    setIsSearching(false);
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const addText = () => {
    if (!newText.trim()) return;
    const newElement = {
      id: Date.now(),
      type: 'text',
      content: newText,
      x: 50,
      y: 50,
      size: 24,
      color: textColor,
      font: 'font-bold'
    };
    setElements([...elements, newElement]);
    setNewText('');
    setActivePanel(null);
    setSelectedElement(newElement.id);
  };

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
    setActivePanel(null);
    setSelectedElement(newElement.id);
  };

  const deleteSelected = () => {
    if (selectedElement) {
      setElements(elements.filter(el => el.id !== selectedElement));
      setSelectedElement(null);
    }
  };

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

  const previewTrack = (track) => {
    if (audioRef.current) audioRef.current.pause();
    if (previewingTrackId === track.id) {
      setPreviewingTrackId(null);
    } else if (track.url) {
      audioRef.current = new Audio(track.url);
      audioRef.current.volume = 0.5;
      audioRef.current.play();
      setPreviewingTrackId(track.id);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause();
          setPreviewingTrackId(null);
        }
      }, 10000);
    }
  };

  const selectTrack = (track) => {
    if (audioRef.current) audioRef.current.pause();
    setSelectedMusic(track);
    setPreviewingTrackId(null);
    setActivePanel(null);
  };

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
        return { ...el, x: Math.max(5, Math.min(95, newX)), y: Math.max(5, Math.min(95, newY)) };
      }
      return el;
    }));
  };

  const handleDragEnd = () => setIsDragging(false);

  const handleSave = async () => {
    const musicData = selectedMusic ? {
      id: selectedMusic.id,
      name: selectedMusic.name,
      artist: selectedMusic.artist,
      url: selectedMusic.url,
      icon: selectedMusic.icon
    } : null;

    if (mediaType === 'video') {
      onSave({ type: 'overlay', elements, music: musicData });
      return;
    }

    // For images, render to canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      elements.forEach(el => {
        const x = (el.x / 100) * canvas.width;
        const y = (el.y / 100) * canvas.height;
        if (el.type === 'text') {
          const fontSize = (el.size / 100) * canvas.width * 0.1;
          ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
          ctx.fillStyle = el.color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 4;
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
        onSave({ type: 'image', blob, elements, music: musicData });
      }, 'image/jpeg', 0.9);
    };
    img.src = mediaUrl;
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 bg-black"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
      >
        <button onClick={onCancel} className="p-2 bg-white/20 rounded-full">
          <X size={24} className="text-white" />
        </button>
        <span className="text-white font-bold text-lg">Edit Media</span>
        <button onClick={handleSave} className="px-4 py-2 bg-green-500 text-white font-bold rounded-full">
          Done
        </button>
      </div>

      {/* Media Area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        onClick={() => setSelectedElement(null)}
      >
        {mediaType === 'video' ? (
          <video src={mediaUrl} className="w-full h-full object-contain" loop muted autoPlay playsInline />
        ) : (
          <img src={mediaUrl} alt="Preview" className="w-full h-full object-contain" />
        )}

        {/* Render Elements */}
        {elements.map(el => (
          <div
            key={el.id}
            className={`absolute cursor-move select-none ${selectedElement === el.id ? 'ring-2 ring-cyan-400' : ''}`}
            style={{
              left: `${el.x}%`,
              top: `${el.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${el.size}px`,
              color: el.color,
              textShadow: el.type === 'text' ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none'
            }}
            onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, el.id); }}
            onTouchStart={(e) => { e.stopPropagation(); handleDragStart(e, el.id); }}
            onClick={(e) => { e.stopPropagation(); setSelectedElement(el.id); }}
          >
            <span className="font-bold">{el.content}</span>
          </div>
        ))}

        {/* Element Controls */}
        {selectedElement && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 bg-black/80 rounded-full px-4 py-2">
            <button onClick={() => updateSize(-4)} className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
              <Minus size={20} className="text-white" />
            </button>
            <button onClick={deleteSelected} className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
              <Trash2 size={20} className="text-white" />
            </button>
            <button onClick={() => updateSize(4)} className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
              <Plus size={20} className="text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Music Indicator */}
      {selectedMusic && !activePanel && (
        <div className="bg-gray-900 px-4 py-2 flex items-center gap-3">
          <span className="text-2xl">{selectedMusic.icon}</span>
          <div className="flex-1">
            <p className="text-white text-sm font-medium">{selectedMusic.name}</p>
            <p className="text-gray-400 text-xs">{selectedMusic.artist}</p>
          </div>
          <button onClick={() => setSelectedMusic(null)} className="text-gray-400">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Bottom Toolbar - ALWAYS VISIBLE */}
      {!activePanel && (
        <div
          className="bg-gray-900 border-t border-gray-700"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          <div className="flex justify-around py-4">
            <button
              onClick={() => setActivePanel('text')}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center">
                <Type size={28} className="text-white" />
              </div>
              <span className="text-white text-xs">Text</span>
            </button>
            <button
              onClick={() => setActivePanel('stickers')}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 bg-orange-500 rounded-xl flex items-center justify-center">
                <Smile size={28} className="text-white" />
              </div>
              <span className="text-white text-xs">Stickers</span>
            </button>
            <button
              onClick={() => setActivePanel('music')}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 bg-green-500 rounded-xl flex items-center justify-center">
                <Music size={28} className="text-white" />
              </div>
              <span className="text-white text-xs">Music</span>
            </button>
          </div>
        </div>
      )}

      {/* Text Panel */}
      {activePanel === 'text' && (
        <div
          className="bg-gray-900 border-t border-gray-700 p-4"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setActivePanel(null)} className="text-gray-400 text-sm">Cancel</button>
            <span className="text-white font-bold">Add Text</span>
            <button onClick={addText} className="text-cyan-400 font-bold text-sm">Add</button>
          </div>
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Enter text..."
            autoFocus
            className="w-full p-3 bg-gray-800 rounded-xl text-white placeholder-gray-500 text-lg mb-4"
          />
          <div className="flex gap-2 flex-wrap">
            {TEXT_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setTextColor(color)}
                className={`w-8 h-8 rounded-full ${textColor === color ? 'ring-2 ring-white' : ''}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Stickers Panel */}
      {activePanel === 'stickers' && (
        <div
          className="bg-gray-900 border-t border-gray-700 p-4 max-h-[50vh] overflow-y-auto"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setActivePanel(null)} className="text-gray-400 text-sm">Cancel</button>
            <span className="text-white font-bold">Add Sticker</span>
            <div className="w-12"></div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {EMOJI_LIST.map((emoji, i) => (
              <button
                key={i}
                onClick={() => addEmoji(emoji)}
                className="w-12 h-12 text-2xl flex items-center justify-center hover:bg-gray-700 rounded-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Music Panel */}
      {activePanel === 'music' && (
        <div
          className="bg-gray-900 border-t border-gray-700 p-4 max-h-[60vh] overflow-y-auto"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { setActivePanel(null); if(audioRef.current) audioRef.current.pause(); setPreviewingTrackId(null); setSearchResults([]); setSearchQuery(''); }} className="text-gray-400 text-sm">Cancel</button>
            <span className="text-white font-bold">Add Music</span>
            <div className="w-12"></div>
          </div>

          {/* Search Bar */}
          {spotifyEnabled && (
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search songs..."
                className="flex-1 px-4 py-2 bg-gray-800 rounded-full text-white placeholder-gray-500"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="px-4 py-2 bg-green-500 rounded-full text-white"
              >
                {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              </button>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">Search Results</p>
              <div className="space-y-2">
                {searchResults.map(track => (
                  <div
                    key={track.id}
                    className={`flex items-center gap-3 p-3 rounded-xl ${selectedMusic?.id === track.id ? 'bg-green-500/20 border border-green-500' : 'bg-gray-800'}`}
                  >
                    {track.cover ? (
                      <img src={track.cover} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center">🎵</div>
                    )}
                    <div className="flex-1 min-w-0" onClick={() => selectTrack(track)}>
                      <p className="text-white font-medium truncate">{track.name}</p>
                      <p className="text-gray-400 text-sm truncate">{track.artist}</p>
                    </div>
                    <button
                      onClick={() => previewTrack(track)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${previewingTrackId === track.id ? 'bg-green-500' : 'bg-gray-700'}`}
                    >
                      {previewingTrackId === track.id ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white" />}
                    </button>
                    <button
                      onClick={() => selectTrack(track)}
                      className={`px-3 py-1.5 rounded-full font-medium text-sm ${selectedMusic?.id === track.id ? 'bg-green-500 text-white' : 'bg-gray-700 text-white'}`}
                    >
                      {selectedMusic?.id === track.id ? <Check size={14} /> : 'Use'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {Object.keys(musicTracks).map(cat => (
              <button
                key={cat}
                onClick={() => setMusicCategory(cat)}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium ${
                  musicCategory === cat ? 'bg-white text-black' : 'bg-gray-800 text-gray-300'
                }`}
              >
                {cat === 'Trending' && '🔥 '}{cat === 'Viral' && '📈 '}{cat}
              </button>
            ))}
          </div>

          {/* Loading State */}
          {isLoadingTracks && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-green-500" />
              <span className="ml-2 text-gray-400">Loading tracks...</span>
            </div>
          )}

          {/* Track List */}
          {!isLoadingTracks && musicTracks[musicCategory] && (
            <div className="space-y-2">
              {musicTracks[musicCategory].map(track => (
                <div
                  key={track.id}
                  className={`flex items-center gap-3 p-3 rounded-xl ${selectedMusic?.id === track.id ? 'bg-green-500/20 border border-green-500' : 'bg-gray-800'}`}
                >
                  {track.cover ? (
                    <img src={track.cover} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <button
                      onClick={() => previewTrack(track)}
                      className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${previewingTrackId === track.id ? 'bg-green-500' : 'bg-gray-700'}`}
                    >
                      {previewingTrackId === track.id ? <Pause size={20} className="text-white" /> : (track.icon || '🎵')}
                    </button>
                  )}
                  <div className="flex-1 min-w-0" onClick={() => selectTrack(track)}>
                    <p className="text-white font-medium truncate">{track.name}</p>
                    <p className="text-gray-400 text-sm truncate">{track.artist}</p>
                  </div>
                  {track.cover && (
                    <button
                      onClick={() => previewTrack(track)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${previewingTrackId === track.id ? 'bg-green-500' : 'bg-gray-700'}`}
                    >
                      {previewingTrackId === track.id ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white" />}
                    </button>
                  )}
                  <button
                    onClick={() => selectTrack(track)}
                    className={`px-3 py-1.5 rounded-full font-medium text-sm ${selectedMusic?.id === track.id ? 'bg-green-500 text-white' : 'bg-gray-700 text-white'}`}
                  >
                    {selectedMusic?.id === track.id ? <Check size={14} /> : 'Use'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Spotify attribution */}
          {spotifyEnabled && (
            <p className="text-center text-gray-500 text-xs mt-4">
              🎵 Powered by Spotify · 30-second previews
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MediaEditor;
