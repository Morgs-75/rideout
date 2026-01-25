import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, MessageCircle, ChevronUp, ChevronDown, Send, MapPin, Share2, MoreHorizontal, Pencil, Trash2, X, Check } from 'lucide-react';
import { doc, getDoc, collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, increment, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import ShareModal from '../components/ShareModal';
import { awardCommentGiven, awardCommentReceived, awardLikeReceived } from '../services/pointsService';

const PostDetail = () => {
  const { postId } = useParams();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [commentLikes, setCommentLikes] = useState({});

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [postId]);

  const handleCommentLike = async (comment) => {
    if (!user) return;

    const commentRef = doc(db, 'comments', comment.id);
    const isLiked = comment.likedBy?.includes(user.uid);

    // Optimistic update
    setComments(prevComments =>
      prevComments.map(c => {
        if (c.id === comment.id) {
          return {
            ...c,
            likes: (c.likes || 0) + (isLiked ? -1 : 1),
            likedBy: isLiked
              ? (c.likedBy || []).filter(id => id !== user.uid)
              : [...(c.likedBy || []), user.uid]
          };
        }
        return c;
      })
    );

    try {
      if (isLiked) {
        await updateDoc(commentRef, {
          likes: increment(-1),
          likedBy: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(commentRef, {
          likes: increment(1),
          likedBy: arrayUnion(user.uid)
        });
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      // Revert on error
      fetchComments();
    }
  };

  const fetchPost = async () => {
    try {
      const postDoc = await getDoc(doc(db, 'posts', postId));
      if (postDoc.exists()) {
        const postData = { id: postDoc.id, ...postDoc.data() };
        setPost(postData);
        setLikes(postData.likes || 0);
        setLiked(postData.likedBy?.includes(user?.uid) || false);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      // Simple query without orderBy to avoid index requirement
      const commentsQuery = query(collection(db, 'comments'), where('postId', '==', postId));
      const snapshot = await getDocs(commentsQuery);
      const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort client-side by createdAt descending
      commentsData.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime - aTime;
      });
      setComments(commentsData);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    }
  };

  const handleLike = async () => {
    if (!user) return;
    const postRef = doc(db, 'posts', postId);
    if (liked) {
      setLikes(l => l - 1);
      setLiked(false);
      await updateDoc(postRef, { likes: increment(-1), likedBy: arrayRemove(user.uid) });
    } else {
      setLikes(l => l + 1);
      setLiked(true);
      await updateDoc(postRef, { likes: increment(1), likedBy: arrayUnion(user.uid) });
      // Award points to post author
      if (post && post.userId !== user.uid) {
        awardLikeReceived(post.userId, user.uid, postId);
      }
    }
  };

  const handleComment = async () => {
    const commentText = newComment.trim();
    if (!commentText || !user) {
      console.log('Cannot comment:', { hasText: !!commentText, hasUser: !!user });
      return;
    }

    try {
      const commentData = {
        postId,
        userId: user.uid,
        streetName: userProfile?.streetName || 'Unknown',
        userAvatar: userProfile?.avatar || '',
        text: commentText,
        upvotes: 0,
        downvotes: 0,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'comments'), commentData);
      await updateDoc(doc(db, 'posts', postId), { commentCount: increment(1) });
      setComments([{ id: docRef.id, ...commentData, createdAt: { toDate: () => new Date() } }, ...comments]);
      setNewComment('');
      // Award points
      awardCommentGiven(user.uid);
      if (post && post.userId !== user.uid) {
        awardCommentReceived(post.userId, user.uid, postId);
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment. Please try again.');
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editingText.trim()) return;

    try {
      await updateDoc(doc(db, 'comments', commentId), {
        text: editingText.trim(),
        editedAt: serverTimestamp()
      });
      setComments(comments.map(c =>
        c.id === commentId ? { ...c, text: editingText.trim(), edited: true } : c
      ));
      setEditingCommentId(null);
      setEditingText('');
    } catch (error) {
      console.error('Error editing comment:', error);
      alert('Failed to edit comment.');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Delete this comment?')) return;

    try {
      await deleteDoc(doc(db, 'comments', commentId));
      await updateDoc(doc(db, 'posts', postId), { commentCount: increment(-1) });
      setComments(comments.filter(c => c.id !== commentId));
      setMenuOpenId(null);
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment.');
    }
  };

  const startEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.text);
    setMenuOpenId(null);
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditingText('');
  };

  const timeAgo = (timestamp) => {
    if (!timestamp) return '';
    const seconds = Math.floor((Date.now() - timestamp.toDate()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  if (loading) return <div className="min-h-screen bg-dark-bg flex items-center justify-center"><div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin"></div></div>;
  if (!post) return <div className="min-h-screen bg-dark-bg flex items-center justify-center text-gray-500">Post not found</div>;

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="sticky top-0 z-40 bg-dark-bg/95 backdrop-blur-lg border-b border-dark-border safe-top">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            to="/feed"
            className="p-3 -ml-2 text-gray-400 hover:text-white touch-manipulation flex items-center justify-center"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <ArrowLeft size={24} />
          </Link>
          <h1 className="font-semibold">Post</h1>
          <button onClick={() => setShowShare(true)} className="p-3 text-gray-400 hover:text-white touch-manipulation" style={{ minWidth: '48px', minHeight: '48px' }}><Share2 size={20} /></button>
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        {/* Post Header */}
        <div className="flex items-center justify-between p-4">
          <Link to={`/profile/${post.userId}`} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-blue to-neon-green p-0.5">
              <div className="w-full h-full rounded-full bg-dark-bg overflow-hidden flex items-center justify-center">
                {post.userAvatar ? <img src={post.userAvatar} alt="" className="w-full h-full object-cover" /> : <span className="text-neon-blue font-bold">{post.streetName?.charAt(0).toUpperCase()}</span>}
              </div>
            </div>
            <div>
              <p className="font-semibold">{post.streetName}</p>
              {post.location && <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={12} />{post.location.name}</p>}
            </div>
          </Link>
        </div>

        {/* Media */}
        <div className="aspect-square bg-dark-card">
          {post.mediaType === 'video' ? <video src={post.mediaUrl} className="w-full h-full object-cover" controls loop playsInline /> : <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />}
        </div>

        {/* Actions */}
        <div className="p-4">
          <div className="flex items-center gap-4 mb-3">
            <button onClick={handleLike} className={`flex items-center gap-1.5 ${liked ? 'text-red-500' : 'text-gray-400'}`}>
              <Heart size={24} fill={liked ? 'currentColor' : 'none'} /><span className="font-medium">{likes}</span>
            </button>
            <span className="flex items-center gap-1.5 text-gray-400"><MessageCircle size={24} /><span className="font-medium">{comments.length}</span></span>
          </div>
          {post.caption && <p className="text-sm"><Link to={`/profile/${post.userId}`} className="font-semibold mr-2">{post.streetName}</Link>{post.caption}</p>}
          <p className="text-xs text-gray-500 mt-2">{timeAgo(post.createdAt)}</p>
        </div>

        {/* Comments */}
        <div className="border-t border-dark-border">
          <div className="p-4 space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Link to={`/profile/${comment.userId}`} className="w-8 h-8 rounded-full bg-dark-card flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {comment.userAvatar ? <img src={comment.userAvatar} alt="" className="w-full h-full object-cover" /> : <span className="text-xs text-neon-blue">{comment.streetName?.charAt(0)}</span>}
                </Link>
                <div className="flex-1">
                  {editingCommentId === comment.id ? (
                    /* Edit Mode */
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-white text-sm focus:border-neon-blue"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditComment(comment.id)}
                          className="px-3 py-1 bg-neon-blue text-dark-bg rounded-lg text-xs font-medium flex items-center gap-1"
                        >
                          <Check size={14} /> Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1 bg-dark-surface text-gray-400 rounded-lg text-xs font-medium flex items-center gap-1"
                        >
                          <X size={14} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <>
                      <p className="text-sm">
                        <Link to={`/profile/${comment.userId}`} className="font-semibold mr-2">{comment.streetName}</Link>
                        {comment.text}
                        {(comment.edited || comment.editedAt) && <span className="text-gray-500 text-xs ml-1">(edited)</span>}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-gray-500">{timeAgo(comment.createdAt)}</p>
                        <button
                          onClick={() => handleCommentLike(comment)}
                          className={`flex items-center gap-1 text-xs ${
                            comment.likedBy?.includes(user?.uid)
                              ? 'text-red-500'
                              : 'text-gray-500 hover:text-red-500'
                          }`}
                        >
                          <Heart size={12} fill={comment.likedBy?.includes(user?.uid) ? 'currentColor' : 'none'} />
                          {(comment.likes || 0) > 0 && <span>{comment.likes}</span>}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Comment Menu - only for comment owner */}
                {user?.uid === comment.userId && editingCommentId !== comment.id && (
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === comment.id ? null : comment.id)}
                      className="p-1 text-gray-500 hover:text-white rounded-full"
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {menuOpenId === comment.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setMenuOpenId(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-32 bg-dark-surface border border-dark-border rounded-xl overflow-hidden z-20 shadow-xl">
                          <button
                            onClick={() => startEditComment(comment)}
                            className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-dark-card transition-all text-white text-sm"
                          >
                            <Pencil size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-dark-card transition-all text-red-400 text-sm"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>

        {/* Spacer for fixed comment input */}
        <div className="h-24"></div>
      </div>

      {/* Fixed Comment Input at bottom */}
      <div
        className="fixed left-0 right-0 p-4 bg-dark-bg border-t border-dark-border"
        style={{ bottom: '70px', zIndex: 9999 }}
      >
        <div className="max-w-lg mx-auto flex gap-3 items-center">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-4 py-3 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-blue text-base"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newComment.trim()) {
                e.preventDefault();
                handleComment();
              }
            }}
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              console.log('Send clicked', { newComment: newComment.trim() });
              if (newComment.trim()) handleComment();
            }}
            onTouchStart={(e) => {
              console.log('Touch start');
              e.currentTarget.style.transform = 'scale(0.95)';
              e.currentTarget.style.opacity = '0.8';
            }}
            onTouchEnd={(e) => {
              console.log('Touch end', { newComment: newComment.trim() });
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.opacity = '1';
              if (newComment.trim()) {
                handleComment();
              }
            }}
            className={`p-4 rounded-xl touch-manipulation cursor-pointer select-none flex items-center justify-center transition-transform ${
              newComment.trim() ? 'bg-neon-blue text-dark-bg' : 'bg-gray-600 text-gray-400'
            }`}
            style={{ minWidth: '52px', minHeight: '52px', WebkitTapHighlightColor: 'transparent' }}
          >
            <Send size={22} />
          </div>
        </div>
      </div>

      {showShare && <ShareModal post={post} onClose={() => setShowShare(false)} />}
    </div>
  );
};

export default PostDetail;
