import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Image, Video, X, MapPin, Hash, Loader2, Share2 } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { demoPosts } from '../utils/demoStore';
import LocationPicker from '../components/LocationPicker';

const CreatePost = () => {
  const { user, userProfile, isDemo } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [media, setMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [shareToSnap, setShareToSnap] = useState(false);
  const [shareToTikTok, setShareToTikTok] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);

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
        setError('');
      };
      video.src = URL.createObjectURL(file);
    } else {
      setMedia(file);
      setMediaType('photo');
      setMediaPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const removeMedia = () => {
    setMedia(null);
    setMediaPreview(null);
    setMediaType(null);
    setVideoDuration(0);
  };

  const extractHashtags = (text) => {
    const regex = /#(\w+)/g;
    const matches = text.match(regex);
    return matches ? matches.map(tag => tag.slice(1).toLowerCase()) : [];
  };

  const handlePost = async () => {
    if (!media) {
      setError('Please select a photo or video');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let mediaUrl = mediaPreview;

      // In demo mode, use the local preview URL
      // In production, upload to Firebase
      if (!isDemo) {
        const mediaRef = ref(storage, `posts/${user.uid}/${Date.now()}_${media.name}`);
        await uploadBytes(mediaRef, media);
        mediaUrl = await getDownloadURL(mediaRef);
      }

      const postData = {
        userId: user.uid,
        streetName: userProfile?.streetName || 'Unknown',
        userAvatar: userProfile?.avatar || '',
        mediaType,
        mediaUrl,
        caption: caption.trim(),
        hashtags: extractHashtags(caption),
        likes: 0,
        likedBy: [],
        upvotes: 0,
        downvotes: 0,
        upvotedBy: [],
        downvotedBy: [],
        commentCount: 0,
        ...(location && { location: { name: location.name, lat: location.lat, lng: location.lng } })
      };

      if (isDemo) {
        // Save to local demo store
        demoPosts.add(postData);
      } else {
        // Save to Firebase
        postData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'posts'), postData);
      }

      navigate('/feed');
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg pb-8">
      <header className="sticky top-0 z-40 bg-dark-bg/95 backdrop-blur-lg border-b border-dark-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-white touch-manipulation" style={{ minWidth: '48px', minHeight: '48px' }}>
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-semibold">New Post</h1>
          <div className="w-12"></div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </motion.div>
        )}

        {!media ? (
          <div
            className="aspect-square bg-dark-card border-2 border-dashed border-dark-border rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-neon-blue transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-neon-blue/20 flex items-center justify-center">
                <Image size={32} className="text-neon-blue" />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-neon-green/20 flex items-center justify-center">
                <Video size={32} className="text-neon-green" />
              </div>
            </div>
            <p className="text-white font-medium mb-1">Add Photo or Video</p>
            <p className="text-gray-500 text-sm">Videos must be 30 seconds or less</p>
          </div>
        ) : (
          <div className="relative aspect-square bg-dark-card rounded-2xl overflow-hidden">
            {mediaType === 'video' ? (
              <video src={mediaPreview} className="w-full h-full object-cover" controls loop muted playsInline />
            ) : (
              <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
            )}
            <button onClick={removeMedia} className="absolute top-3 right-3 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white">
              <X size={18} />
            </button>
            {mediaType === 'video' && (
              <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/60 rounded-lg text-xs text-white">{videoDuration.toFixed(1)}s</div>
            )}
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleMediaSelect} className="hidden" />

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

        {/* Post Button */}
        <button
          onClick={handlePost}
          disabled={!media || loading}
          className={`w-full mt-6 py-4 rounded-xl font-bold text-lg transition-all touch-manipulation ${
            media && !loading
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
      </div>

      {showLocationPicker && (
        <LocationPicker
          initialLocation={location}
          onSelect={(loc) => { setLocation(loc); setShowLocationPicker(false); }}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </div>
  );
};

export default CreatePost;
