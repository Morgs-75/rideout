import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Image, Video, X, MapPin, Hash, Loader2, Share2, Type, Palette, Smile, Music, Plus, Minus } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { demoPosts } from '../utils/demoStore';
import LocationPicker from '../components/LocationPicker';
import MediaEditor from '../components/MediaEditor';
import { awardPostCreated } from '../services/pointsService';

// Background gradient options for text posts
const BACKGROUND_OPTIONS = [
  { id: 'gradient1', style: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', name: 'Purple' },
  { id: 'gradient2', style: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', name: 'Pink' },
  { id: 'gradient3', style: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', name: 'Blue' },
  { id: 'gradient4', style: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', name: 'Green' },
  { id: 'gradient5', style: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', name: 'Sunset' },
  { id: 'gradient6', style: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', name: 'Soft' },
  { id: 'gradient7', style: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', name: 'Rose' },
  { id: 'gradient8', style: 'linear-gradient(135deg, #00D4FF 0%, #39FF14 100%)', name: 'Neon' },
  { id: 'solid1', style: '#1a1a1a', name: 'Dark' },
  { id: 'solid2', style: '#0a0a0a', name: 'Black' },
];

// Font options for text posts
const FONT_OPTIONS = [
  { id: 'default', name: 'Default', className: '' },
  { id: 'bold', name: 'Bold', className: 'font-black' },
  { id: 'serif', name: 'Serif', className: 'font-serif' },
  { id: 'mono', name: 'Mono', className: 'font-mono' },
  { id: 'italic', name: 'Italic', className: 'italic' },
];

const CreatePost = () => {
  const { user, userProfile, isDemo } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [mode, setMode] = useState(null); // null, 'media', or 'text'
  const [media, setMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [caption, setCaption] = useState('');
  const [textContent, setTextContent] = useState(''); // For text-only posts
  const [textBackground, setTextBackground] = useState(BACKGROUND_OPTIONS[7]); // Default to Neon
  const [textFont, setTextFont] = useState(FONT_OPTIONS[0]);
  const [textSize, setTextSize] = useState(24); // Text size in px
  const [textColor, setTextColor] = useState('#FFFFFF'); // Text color
  const [textX, setTextX] = useState(50); // Text X position (%)
  const [textY, setTextY] = useState(50); // Text Y position (%)
  const [textStickers, setTextStickers] = useState([]); // Stickers on text posts
  const [selectedSticker, setSelectedSticker] = useState(null); // Selected sticker for editing
  const [draggingSticker, setDraggingSticker] = useState(null);
  const [draggingText, setDraggingText] = useState(false);
  const [textDragMoved, setTextDragMoved] = useState(false); // Track if text was actually dragged
  const textPreviewRef = useRef(null);
  const textInputRef = useRef(null); // Ref to focus textarea
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showTextStickers, setShowTextStickers] = useState(false);
  const [showTextMusic, setShowTextMusic] = useState(false);
  const [location, setLocation] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [shareToSnap, setShareToSnap] = useState(false);
  const [shareToTikTok, setShareToTikTok] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [initialPanel, setInitialPanel] = useState(null); // Which panel to open first
  const [editedMedia, setEditedMedia] = useState(null); // Blob from editor
  const [overlayElements, setOverlayElements] = useState([]); // For video overlays
  const [musicData, setMusicData] = useState(null); // Music track info

  const openEditor = (panel = null) => {
    // For text posts, show inline pickers
    if (mode === 'text') {
      if (panel === 'stickers') {
        setShowTextStickers(true);
        setShowTextMusic(false);
      } else if (panel === 'music') {
        setShowTextMusic(true);
        setShowTextStickers(false);
      }
      return;
    }
    // For media posts, open the full editor
    setInitialPanel(panel);
    setShowEditor(true);
  };

  // Add sticker to text post
  const addTextSticker = (emoji) => {
    const newSticker = {
      id: Date.now(),
      emoji,
      x: 50, // Center
      y: 30,
      size: 40
    };
    setTextStickers([...textStickers, newSticker]);
    setSelectedSticker(newSticker.id);
    setShowTextStickers(false);
  };

  // Handle sticker drag
  const handleStickerDrag = (e, stickerId) => {
    if (!textPreviewRef.current) return;
    const rect = textPreviewRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    setTextStickers(stickers => stickers.map(s =>
      s.id === stickerId ? { ...s, x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) } : s
    ));
  };

  // Resize sticker
  const resizeSticker = (stickerId, delta) => {
    setTextStickers(stickers => stickers.map(s =>
      s.id === stickerId ? { ...s, size: Math.max(20, Math.min(120, s.size + delta)) } : s
    ));
  };

  // Delete sticker
  const deleteSticker = (stickerId) => {
    setTextStickers(stickers => stickers.filter(s => s.id !== stickerId));
    setSelectedSticker(null);
  };

  // Handle text drag
  const handleTextDrag = (e) => {
    if (!draggingText || !textPreviewRef.current) return;
    setTextDragMoved(true); // Mark that actual movement occurred
    const rect = textPreviewRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setTextX(Math.max(10, Math.min(90, x)));
    setTextY(Math.max(10, Math.min(90, y)));
  };

  // Handle text tap (focus textarea if not dragged)
  const handleTextDragEnd = () => {
    if (!textDragMoved && textInputRef.current) {
      // It was a tap, not a drag - focus the textarea
      textInputRef.current.focus();
      textInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setDraggingText(false);
    setTextDragMoved(false);
  };

  const handleMediaSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      setError('Please select an image or video file');
      return;
    }

    if (isVideo) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        if (video.duration > 30) {
          setError('Video must be 30 seconds or less');
          return;
        }
        setVideoDuration(video.duration);
        setMedia(file);
        setMediaType('video');
        setMediaPreview(URL.createObjectURL(file));
        setMode('media');
        setError('');
      };
      video.src = URL.createObjectURL(file);
    } else {
      setMedia(file);
      setMediaType('photo');
      setMediaPreview(URL.createObjectURL(file));
      setMode('media');
      setError('');
    }
  };

  const removeMedia = () => {
    setMedia(null);
    setMediaPreview(null);
    setMediaType(null);
    setVideoDuration(0);
    setEditedMedia(null);
    setOverlayElements([]);
    setMusicData(null);
    setMode(null);
  };

  const resetTextMode = () => {
    setMode(null);
    setTextContent('');
    setTextBackground(BACKGROUND_OPTIONS[7]);
    setTextFont(FONT_OPTIONS[0]);
  };

  const handleEditorSave = (result) => {
    if (result.type === 'image' && result.blob) {
      // For images, use the rendered blob
      setEditedMedia(result.blob);
      setMediaPreview(URL.createObjectURL(result.blob));
    } else if (result.type === 'overlay') {
      // For videos, store overlay elements
      setOverlayElements(result.elements);
    }
    // Store music data if present
    if (result.music) {
      setMusicData(result.music);
    }
    setShowEditor(false);
  };

  const extractHashtags = (text) => {
    const regex = /#(\w+)/g;
    const matches = text.match(regex);
    return matches ? matches.map(tag => tag.slice(1).toLowerCase()) : [];
  };

  const handlePost = async () => {
    // Validate based on mode
    if (mode === 'text' && !textContent.trim()) {
      setError('Please enter some text');
      return;
    }
    if (mode === 'media' && !media) {
      setError('Please select a photo or video');
      return;
    }
    if (!mode) {
      setError('Please select a post type');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let mediaUrl = mediaPreview;

      // In demo mode, use the local preview URL
      // In production, upload to Firebase
      if (!isDemo && media) {
        // Use edited media if available (for images with overlays)
        const mediaToUpload = editedMedia || media;
        const fileName = editedMedia ? `${Date.now()}_edited.jpg` : `${Date.now()}_${media.name}`;
        const mediaRef = ref(storage, `posts/${user.uid}/${fileName}`);
        await uploadBytes(mediaRef, mediaToUpload);
        mediaUrl = await getDownloadURL(mediaRef);
      }

      const postData = {
        userId: user.uid,
        streetName: userProfile?.streetName || 'Unknown',
        userAvatar: userProfile?.avatar || '',
        mediaType: mode === 'media' ? mediaType : 'none',
        mediaUrl: mode === 'media' ? mediaUrl : '',
        caption: mode === 'media' ? caption.trim() : '',
        hashtags: extractHashtags(mode === 'media' ? caption : textContent),
        likes: 0,
        likedBy: [],
        upvotes: 0,
        downvotes: 0,
        upvotedBy: [],
        downvotedBy: [],
        commentCount: 0,
        isTextOnly: mode === 'text',
        // Text post specific data
        ...(mode === 'text' && {
          textContent: textContent.trim(),
          textBackground: textBackground.style,
          textBackgroundId: textBackground.id,
          textFont: textFont.className,
          textFontId: textFont.id,
          textSize: textSize,
          textColor: textColor,
          textX: textX,
          textY: textY,
          textStickers: textStickers,
        }),
        ...(location && { location: { name: location.name, lat: location.lat, lng: location.lng } }),
        // Include overlay elements for videos
        ...(overlayElements.length > 0 && { overlayElements }),
        // Include music data
        ...(musicData && { music: musicData })
      };

      if (isDemo) {
        // Save to local demo store
        demoPosts.add(postData);
      } else {
        // Save to Firebase
        postData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'posts'), postData);
        // Award points for creating post
        awardPostCreated(user.uid);
      }

      navigate('/feed');
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (mode) {
      // If in a mode, go back to selection
      if (mode === 'media') {
        removeMedia();
      } else {
        resetTextMode();
      }
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg pb-8">
      <header
        className="sticky top-0 z-40 bg-dark-bg/95 backdrop-blur-lg border-b border-dark-border"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="p-3 -ml-3 text-gray-400 hover:text-white touch-manipulation flex items-center justify-center rounded-full active:bg-dark-surface"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-semibold text-white">New Post</h1>
          <div className="w-12"></div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </motion.div>
        )}

        {/* Mode Selection */}
        {!mode && (
          <div className="space-y-4">
            {/* Photo/Video Option */}
            <div
              className="aspect-video bg-dark-card border-2 border-dashed border-dark-border rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-neon-blue transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-neon-blue/20 flex items-center justify-center">
                  <Image size={28} className="text-neon-blue" />
                </div>
                <div className="w-14 h-14 rounded-2xl bg-neon-green/20 flex items-center justify-center">
                  <Video size={28} className="text-neon-green" />
                </div>
              </div>
              <p className="text-white font-medium mb-1">Photo or Video</p>
              <p className="text-gray-500 text-sm">Videos must be 30 seconds or less</p>
            </div>

            {/* Text Post Option */}
            <div
              className="aspect-video bg-dark-card border-2 border-dashed border-dark-border rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 transition-all"
              onClick={() => setMode('text')}
            >
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-4">
                <Type size={32} className="text-purple-400" />
              </div>
              <p className="text-white font-medium mb-1">Text Post</p>
              <p className="text-gray-500 text-sm">Share thoughts with custom backgrounds</p>
            </div>
          </div>
        )}

        {/* Text Post Editor */}
        {mode === 'text' && (
          <div className="space-y-4">
            {/* Text Preview/Editor */}
            <div
              ref={textPreviewRef}
              className="aspect-square rounded-2xl overflow-hidden relative"
              style={{ background: textBackground.style }}
              onClick={() => setSelectedSticker(null)}
              onMouseMove={handleTextDrag}
              onTouchMove={handleTextDrag}
              onMouseUp={handleTextDragEnd}
              onTouchEnd={handleTextDragEnd}
              onMouseLeave={handleTextDragEnd}
            >
              {/* Draggable Text */}
              <div
                className={`absolute cursor-move select-none max-w-[80%] text-center ${textFont.className} ${draggingText ? 'ring-2 ring-white/50' : ''}`}
                style={{
                  left: `${textX}%`,
                  top: `${textY}%`,
                  transform: 'translate(-50%, -50%)',
                  fontSize: `${textSize}px`,
                  color: textColor,
                  textShadow: '2px 2px 8px rgba(0,0,0,0.5)',
                  lineHeight: '1.4',
                  zIndex: 5
                }}
                onMouseDown={(e) => { e.stopPropagation(); setDraggingText(true); setTextDragMoved(false); setSelectedSticker(null); }}
                onTouchStart={(e) => { e.stopPropagation(); setDraggingText(true); setTextDragMoved(false); setSelectedSticker(null); }}
              >
                {textContent || <span className="opacity-50">Tap to edit text</span>}
              </div>

              {/* Stickers on text post - draggable */}
              {textStickers.map((sticker) => (
                <div
                  key={sticker.id}
                  className={`absolute cursor-move select-none ${selectedSticker === sticker.id ? 'ring-2 ring-neon-blue ring-offset-2 ring-offset-black/50 rounded-lg' : ''}`}
                  style={{
                    left: `${sticker.x}%`,
                    top: `${sticker.y}%`,
                    transform: 'translate(-50%, -50%)',
                    fontSize: `${sticker.size}px`,
                    zIndex: selectedSticker === sticker.id ? 10 : 1
                  }}
                  onClick={(e) => { e.stopPropagation(); setSelectedSticker(sticker.id); }}
                  onMouseDown={(e) => { e.stopPropagation(); setSelectedSticker(sticker.id); setDraggingSticker(sticker.id); }}
                  onTouchStart={(e) => { e.stopPropagation(); setSelectedSticker(sticker.id); setDraggingSticker(sticker.id); }}
                  onMouseMove={(e) => draggingSticker === sticker.id && handleStickerDrag(e, sticker.id)}
                  onTouchMove={(e) => draggingSticker === sticker.id && handleStickerDrag(e, sticker.id)}
                  onMouseUp={() => setDraggingSticker(null)}
                  onTouchEnd={() => setDraggingSticker(null)}
                  onMouseLeave={() => setDraggingSticker(null)}
                >
                  {sticker.emoji}
                </div>
              ))}

              {/* Sticker controls when selected */}
              {selectedSticker && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/90 rounded-2xl px-4 py-3 z-20 border border-white/20">
                  <button
                    onClick={(e) => { e.stopPropagation(); resizeSticker(selectedSticker, -10); }}
                    className="w-11 h-11 bg-gray-600 hover:bg-gray-500 rounded-full flex items-center justify-center text-white active:scale-95 transition-all"
                  >
                    <Minus size={22} />
                  </button>
                  <div className="text-white text-sm font-medium min-w-[50px] text-center">
                    {textStickers.find(s => s.id === selectedSticker)?.size || 40}px
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); resizeSticker(selectedSticker, 10); }}
                    className="w-11 h-11 bg-gray-600 hover:bg-gray-500 rounded-full flex items-center justify-center text-white active:scale-95 transition-all"
                  >
                    <Plus size={22} />
                  </button>
                  <div className="w-px h-8 bg-white/30 mx-1"></div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSticker(selectedSticker); }}
                    className="w-11 h-11 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center text-white active:scale-95 transition-all"
                  >
                    <X size={22} />
                  </button>
                </div>
              )}

              {/* Right side icons - Stickers & Music */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-15">
                <button
                  onClick={() => openEditor('stickers')}
                  className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
                >
                  <Smile size={20} />
                </button>
                <button
                  onClick={() => openEditor('music')}
                  className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
                >
                  <Music size={20} />
                </button>
              </div>

              <div className="absolute bottom-3 right-3 text-white/60 text-sm bg-black/30 px-2 py-1 rounded z-15">
                {textContent.length}/280
              </div>

              {/* Music indicator */}
              {musicData && (
                <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/60 rounded-full flex items-center gap-2 text-white text-sm z-15">
                  <span>{musicData.icon}</span>
                  <span className="max-w-20 truncate">{musicData.name}</span>
                </div>
              )}
            </div>

            {/* Text Input */}
            <div className="bg-dark-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400 flex items-center gap-2">
                  <Type size={16} />
                  Your Text
                </span>
                <span className="text-sm text-gray-500">{textContent.length}/280</span>
              </div>
              <textarea
                ref={textInputRef}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value.slice(0, 280))}
                placeholder="What's on your mind?"
                rows={3}
                className="w-full p-3 bg-dark-surface rounded-xl text-white placeholder-gray-500 resize-none border border-dark-border focus:border-neon-blue transition-all"
                maxLength={280}
              />
            </div>

            {/* Text Size Control */}
            <div className="bg-dark-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400 flex items-center gap-2">
                  <Type size={16} />
                  Text Size
                </span>
                <span className="text-sm text-white">{textSize}px</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setTextSize(Math.max(14, textSize - 2))}
                  className="w-10 h-10 bg-dark-surface rounded-full flex items-center justify-center text-white"
                >
                  <Minus size={18} />
                </button>
                <input
                  type="range"
                  min="14"
                  max="48"
                  value={textSize}
                  onChange={(e) => setTextSize(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-dark-surface rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #00D4FF 0%, #00D4FF ${((textSize - 14) / 34) * 100}%, #374151 ${((textSize - 14) / 34) * 100}%, #374151 100%)`
                  }}
                />
                <button
                  onClick={() => setTextSize(Math.min(48, textSize + 2))}
                  className="w-10 h-10 bg-dark-surface rounded-full flex items-center justify-center text-white"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Text Color Picker */}
            <div className="bg-dark-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400 flex items-center gap-2">
                  <Palette size={16} />
                  Text Color
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {['#FFFFFF', '#000000', '#FF0000', '#FF6B6B', '#FF9500', '#FFCC00', '#4CD964', '#00D4FF', '#007AFF', '#AF52DE', '#FF2D92', '#8E8E93'].map(color => (
                  <button
                    key={color}
                    onClick={() => setTextColor(color)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${textColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Background Picker */}
            <div className="bg-dark-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400 flex items-center gap-2">
                  <Palette size={16} />
                  Background
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {BACKGROUND_OPTIONS.map(bg => (
                  <button
                    key={bg.id}
                    onClick={() => setTextBackground(bg)}
                    className={`w-10 h-10 rounded-lg flex-shrink-0 border-2 transition-all ${
                      textBackground.id === bg.id ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ background: bg.style }}
                  />
                ))}
              </div>
            </div>

            {/* Font Picker */}
            <div className="bg-dark-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400 flex items-center gap-2">
                  <Type size={16} />
                  Font Style
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {FONT_OPTIONS.map(font => (
                  <button
                    key={font.id}
                    onClick={() => setTextFont(font)}
                    className={`px-4 py-2 rounded-lg flex-shrink-0 border transition-all ${
                      textFont.id === font.id
                        ? 'border-neon-blue bg-neon-blue/20 text-white'
                        : 'border-dark-border bg-dark-surface text-gray-400'
                    } ${font.className}`}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Media Post */}
        {mode === 'media' && media && (
          <div className="relative aspect-square bg-dark-card rounded-2xl overflow-hidden">
            {mediaType === 'video' ? (
              <div className="relative w-full h-full">
                <video src={mediaPreview} className="w-full h-full object-cover" controls loop muted playsInline />
                {/* Render overlay elements for video */}
                {overlayElements.map(el => (
                  <div
                    key={el.id}
                    className="absolute pointer-events-none"
                    style={{
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      transform: 'translate(-50%, -50%)',
                      fontSize: `${el.size}px`,
                      color: el.color,
                      textShadow: el.type === 'text' ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none'
                    }}
                  >
                    <span className={el.font || ''}>{el.content}</span>
                  </div>
                ))}
              </div>
            ) : (
              <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
            )}
            {/* X button to remove */}
            <button onClick={removeMedia} className="absolute top-3 left-3 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white">
              <X size={20} />
            </button>

            {/* Right side editing icons - TikTok style */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-4">
              <button
                onClick={() => openEditor('text')}
                className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
              >
                <Type size={24} />
              </button>
              <button
                onClick={() => openEditor('stickers')}
                className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
              >
                <Smile size={24} />
              </button>
              <button
                onClick={() => openEditor('music')}
                className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
              >
                <Music size={24} />
              </button>
            </div>

            {mediaType === 'video' && (
              <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/60 rounded-lg text-xs text-white">{videoDuration.toFixed(1)}s</div>
            )}
            {/* Music indicator */}
            {musicData && (
              <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/60 rounded-full flex items-center gap-2 text-white text-sm">
                <span>{musicData.icon}</span>
                <span className="max-w-24 truncate">{musicData.name}</span>
              </div>
            )}
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleMediaSelect} className="hidden" />

        {/* Caption for media posts */}
        {mode === 'media' && (
          <div className="mt-4">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption... Use #hashtags"
              rows={3}
              className="w-full p-4 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-blue transition-all resize-none"
            />
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Hash size={14} />Hashtags help others discover your ride</span>
              <span>{caption.length}/500</span>
            </div>
          </div>
        )}

        {/* Location picker - show for both modes */}
        {mode && (
          <button
            onClick={() => setShowLocationPicker(true)}
            className="w-full mt-4 p-4 bg-dark-card border border-dark-border rounded-xl flex items-center gap-3 hover:border-neon-blue transition-all"
          >
            <MapPin size={20} className={location ? 'text-neon-blue' : 'text-gray-500'} />
            <span className={location ? 'text-white' : 'text-gray-500'}>{location ? location.name : 'Add location'}</span>
            {location && (
              <button onClick={(e) => { e.stopPropagation(); setLocation(null); }} className="ml-auto text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            )}
          </button>
        )}

        {/* Share options - show for both modes */}
        {mode && (
          <div className="mt-4 p-4 bg-dark-card border border-dark-border rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Share2 size={18} className="text-gray-500" />
              <span className="text-sm text-gray-400">Also share to</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShareToSnap(!shareToSnap)}
                className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  shareToSnap ? 'bg-yellow-400 text-black' : 'bg-dark-surface text-gray-400 border border-dark-border'
                }`}
              >
                Snapchat
              </button>
              <button
                onClick={() => setShareToTikTok(!shareToTikTok)}
                className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  shareToTikTok ? 'bg-white text-black' : 'bg-dark-surface text-gray-400 border border-dark-border'
                }`}
              >
                TikTok
              </button>
            </div>
          </div>
        )}

        {/* Post Button */}
        {mode && (
          <button
            onClick={handlePost}
            disabled={(mode === 'text' && !textContent.trim()) || (mode === 'media' && !media) || loading}
            className={`w-full mt-6 py-4 rounded-xl font-bold text-lg transition-all touch-manipulation ${
              ((mode === 'text' && textContent.trim()) || (mode === 'media' && media)) && !loading
                ? 'bg-gradient-to-r from-neon-blue to-neon-green text-dark-bg'
                : 'bg-dark-card text-gray-500'
            }`}
            style={{ minHeight: '56px' }}
          >
            {loading ? (
              <Loader2 size={24} className="animate-spin mx-auto" />
            ) : (
              'Post'
            )}
          </button>
        )}
      </div>

      {showLocationPicker && (
        <LocationPicker
          initialLocation={location}
          onSelect={(loc) => { setLocation(loc); setShowLocationPicker(false); }}
          onClose={() => setShowLocationPicker(false)}
        />
      )}

      {/* Media Editor */}
      {showEditor && mediaPreview && (
        <MediaEditor
          mediaUrl={editedMedia ? URL.createObjectURL(editedMedia) : mediaPreview}
          mediaType={mediaType}
          initialPanel={initialPanel}
          onSave={handleEditorSave}
          onCancel={() => { setShowEditor(false); setInitialPanel(null); }}
        />
      )}

      {/* Text Post Sticker Picker */}
      <AnimatePresence>
        {showTextStickers && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-end"
            onClick={() => setShowTextStickers(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full bg-dark-card rounded-t-3xl p-6"
              style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setShowTextStickers(false)} className="text-gray-400">Cancel</button>
                <span className="text-white font-bold">Add Sticker</span>
                <div className="w-16"></div>
              </div>
              <div className="grid grid-cols-7 gap-3">
                {['🔥', '⚡', '🏍️', '💨', '🚀', '💯', '🤙', '👊', '😎', '🔊', '🎵', '💪', '😀', '😂', '🤣', '😍', '🥰', '🤩', '😤', '💀', '👻', '🤯', '😈', '❤️', '🖤', '💙', '✨', '🌟'].map((emoji, i) => (
                  <button
                    key={i}
                    onClick={() => addTextSticker(emoji)}
                    className="w-12 h-12 text-2xl flex items-center justify-center hover:bg-dark-surface rounded-xl"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Text Post Music Picker */}
      <AnimatePresence>
        {showTextMusic && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-end"
            onClick={() => setShowTextMusic(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full bg-dark-card rounded-t-3xl p-6 max-h-[70vh] overflow-y-auto"
              style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setShowTextMusic(false)} className="text-gray-400">Cancel</button>
                <span className="text-white font-bold">Add Music</span>
                <div className="w-16"></div>
              </div>
              <div className="space-y-2">
                {[
                  { id: 'none', name: 'No Music', artist: '', icon: '🔇', url: null },
                  { id: 'f1', name: 'Viral Energy', artist: 'RideOut Beats', icon: '🔥', url: 'https://cdn.pixabay.com/audio/2024/02/28/audio_5c4a01a911.mp3' },
                  { id: 'f2', name: 'Main Character', artist: 'TrendSound', icon: '✨', url: 'https://cdn.pixabay.com/audio/2024/01/10/audio_bc5c868cb1.mp3' },
                  { id: 'h1', name: 'Street Dreams', artist: 'Urban Beats', icon: '🎤', url: 'https://cdn.pixabay.com/audio/2023/10/25/audio_14eac0b51e.mp3' },
                  { id: 'e1', name: 'Night Drive', artist: 'Synth Wave', icon: '🌃', url: 'https://cdn.pixabay.com/audio/2024/02/28/audio_5c4a01a911.mp3' },
                  { id: 'c1', name: 'Sunset Vibes', artist: 'Lo-Fi Dreams', icon: '🌅', url: 'https://cdn.pixabay.com/audio/2024/03/11/audio_5eca43847a.mp3' },
                ].map(track => (
                  <button
                    key={track.id}
                    onClick={() => {
                      if (track.id === 'none') {
                        setMusicData(null);
                      } else {
                        setMusicData(track);
                      }
                      setShowTextMusic(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl ${musicData?.id === track.id ? 'bg-neon-blue/20 border border-neon-blue' : 'bg-dark-surface'}`}
                  >
                    <div className="w-12 h-12 rounded-lg bg-dark-card flex items-center justify-center text-xl">
                      {track.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-medium">{track.name}</p>
                      {track.artist && <p className="text-gray-400 text-sm">{track.artist}</p>}
                    </div>
                    {musicData?.id === track.id && (
                      <div className="w-6 h-6 bg-neon-blue rounded-full flex items-center justify-center">
                        <span className="text-dark-bg text-xs">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CreatePost;
