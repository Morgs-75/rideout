import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Hash, Loader2, X } from 'lucide-react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import LocationPicker from '../components/LocationPicker';

const EditPost = () => {
  const { postId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    try {
      const postDoc = await getDoc(doc(db, 'posts', postId));
      if (postDoc.exists()) {
        const postData = { id: postDoc.id, ...postDoc.data() };

        // Check if user owns this post
        if (postData.userId !== user?.uid) {
          navigate('/feed');
          return;
        }

        setPost(postData);
        setCaption(postData.caption || '');
        setLocation(postData.location || null);
      } else {
        navigate('/feed');
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const extractHashtags = (text) => {
    const regex = /#(\w+)/g;
    const matches = text.match(regex);
    return matches ? matches.map(tag => tag.slice(1).toLowerCase()) : [];
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const updates = {
        caption: caption.trim(),
        hashtags: extractHashtags(caption),
        updatedAt: serverTimestamp()
      };

      if (location) {
        updates.location = {
          name: location.name,
          lat: location.lat,
          lng: location.lng
        };
      } else {
        updates.location = null;
      }

      await updateDoc(doc(db, 'posts', postId), updates);
      navigate(`/post/${postId}`);
    } catch (err) {
      console.error('Error updating post:', err);
      setError('Failed to update post. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center text-gray-500">
        Post not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg pb-8">
      <header className="sticky top-0 z-40 bg-dark-bg/95 backdrop-blur-lg border-b border-dark-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-gray-400 hover:text-white touch-manipulation"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-semibold">Edit Post</h1>
          <div className="w-12"></div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Media Preview (read-only) */}
        <div className="relative aspect-square bg-dark-card rounded-2xl overflow-hidden mb-4">
          {post.mediaType === 'video' ? (
            <video
              src={post.mediaUrl}
              className="w-full h-full object-cover"
              controls
              loop
              muted
              playsInline
            />
          ) : (
            <img
              src={post.mediaUrl}
              alt="Post"
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 rounded-lg text-xs text-gray-300">
            Media cannot be changed
          </div>
        </div>

        {/* Caption */}
        <div className="mb-4">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption... Use #hashtags"
            rows={4}
            className="w-full p-4 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-blue transition-all resize-none"
          />
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Hash size={14} />
              Hashtags help others discover your ride
            </span>
            <span>{caption.length}/500</span>
          </div>
        </div>

        {/* Location */}
        <button
          onClick={() => setShowLocationPicker(true)}
          className="w-full p-4 bg-dark-card border border-dark-border rounded-xl flex items-center gap-3 hover:border-neon-blue transition-all"
        >
          <MapPin size={20} className={location ? 'text-neon-blue' : 'text-gray-500'} />
          <span className={location ? 'text-white' : 'text-gray-500'}>
            {location ? location.name : 'Add location'}
          </span>
          {location && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLocation(null);
              }}
              className="ml-auto text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>
          )}
        </button>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-6 py-4 rounded-xl font-bold text-lg transition-all touch-manipulation bg-gradient-to-r from-neon-blue to-neon-green text-dark-bg"
          style={{ minHeight: '56px' }}
        >
          {saving ? (
            <Loader2 size={24} className="animate-spin mx-auto" />
          ) : (
            'Save Changes'
          )}
        </button>
      </div>

      {showLocationPicker && (
        <LocationPicker
          initialLocation={location}
          onSelect={(loc) => {
            setLocation(loc);
            setShowLocationPicker(false);
          }}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </div>
  );
};

export default EditPost;
