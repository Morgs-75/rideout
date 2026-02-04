import { useState, useEffect, useRef, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import LazyImage from './LazyImage';
import LazyVideo from './LazyVideo';
import {
  Heart,
  MessageCircle,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Flag,
  UserX,
  Share2,
  Copy,
  ExternalLink,
  UserPlus,
  UserCheck,
  Send,
  Trash2,
  Pencil,
  Repeat2,
  Music,
  Volume2,
  VolumeX
} from 'lucide-react';
import { doc, updateDoc, increment, arrayUnion, arrayRemove, collection, query, where, getDocs, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { demoPosts } from '../utils/demoStore';
import { notifyLike, notifyUpvote, notifyFollow } from '../utils/notifications';
import { awardLikeReceived, awardUpvoteReceived, awardCommentGiven } from '../services/pointsService';

// Generate circle GeoJSON for Mapbox static API (1.5km radius for alerts)
const generateCircleGeoJSON = (lng, lat, radiusKm = 1.5, points = 24) => {
  const coords = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    // Convert km to degrees (approximate)
    const dLat = (radiusKm / 111) * Math.cos(angle);
    const dLng = (radiusKm / (111 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);
    coords.push([lng + dLng, lat + dLat]);
  }
  const geojson = {
    type: "Feature",
    properties: {
      stroke: "#ff3b30",
      "stroke-width": 2,
      "stroke-opacity": 0.8,
      fill: "#ff3b30",
      "fill-opacity": 0.15
    },
    geometry: {
      type: "Polygon",
      coordinates: [coords]
    }
  };
  return encodeURIComponent(JSON.stringify(geojson));
};

const PostCard = ({ post, onReport, onUpdate }) => {
  const { user, userProfile, isDemo } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const [liked, setLiked] = useState(post.likedBy?.includes(user?.uid) || false);
  const [likes, setLikes] = useState(post.likes || 0);
  const [upvoted, setUpvoted] = useState(post.upvotedBy?.includes(user?.uid) || false);
  const [downvoted, setDownvoted] = useState(post.downvotedBy?.includes(user?.uid) || false);
  const [voteScore, setVoteScore] = useState((post.upvotes || 0) - (post.downvotes || 0));
  const [showMenu, setShowMenu] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [reshareCount, setReshareCount] = useState(post.reshares || 0);
  const [hasReshared, setHasReshared] = useState(post.resharedBy?.includes(user?.uid) || false);
  const [resharing, setResharing] = useState(false);
  const [firstComment, setFirstComment] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Handle music playback
  const toggleMusic = () => {
    if (!post.music?.url) return;

    if (isMusicPlaying) {
      audioRef.current?.pause();
      setIsMusicPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(post.music.url);
        audioRef.current.loop = true;
      }
      audioRef.current.play();
      setIsMusicPlaying(true);
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Fetch first comment
  useEffect(() => {
    const fetchFirstComment = async () => {
      if (isDemo || !post.id) return;
      try {
        const commentsQuery = query(
          collection(db, 'comments'),
          where('postId', '==', post.id)
        );
        const snapshot = await getDocs(commentsQuery);
        if (!snapshot.empty) {
          // Sort by createdAt and get the first one
          const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          comments.sort((a, b) => {
            const aTime = a.createdAt?.toDate?.() || new Date(0);
            const bTime = b.createdAt?.toDate?.() || new Date(0);
            return aTime - bTime;
          });
          setFirstComment(comments[0]);
        }
      } catch (error) {
        console.error('Error fetching first comment:', error);
      }
    };
    fetchFirstComment();
  }, [post.id, isDemo]);

  const handleCommentLike = async (comment) => {
    if (!user || !comment) return;

    const isLiked = comment.likedBy?.includes(user.uid);

    // Optimistic update
    setFirstComment(prev => ({
      ...prev,
      likes: (prev.likes || 0) + (isLiked ? -1 : 1),
      likedBy: isLiked
        ? (prev.likedBy || []).filter(id => id !== user.uid)
        : [...(prev.likedBy || []), user.uid]
    }));

    try {
      const commentRef = doc(db, 'comments', comment.id);
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
    }
  };

  // Check if already following this user
  useEffect(() => {
    const checkFollowing = async () => {
      if (!user || post.userId === user.uid || isDemo) return;

      try {
        const followQuery = query(
          collection(db, 'follows'),
          where('followerId', '==', user.uid),
          where('followingId', '==', post.userId)
        );
        const snapshot = await getDocs(followQuery);
        setIsFollowing(!snapshot.empty);
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    };

    checkFollowing();
  }, [user, post.userId, isDemo]);

  const handleFollow = async (e) => {
    e.stopPropagation();
    if (!user || followLoading) return;

    setFollowLoading(true);

    try {
      if (isFollowing) {
        // Unfollow
        const followQuery = query(
          collection(db, 'follows'),
          where('followerId', '==', user.uid),
          where('followingId', '==', post.userId)
        );
        const snapshot = await getDocs(followQuery);
        snapshot.docs.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
        setIsFollowing(false);
      } else {
        // Follow
        await addDoc(collection(db, 'follows'), {
          followerId: user.uid,
          followingId: post.userId,
          createdAt: serverTimestamp()
        });
        setIsFollowing(true);
        // Send notification
        notifyFollow(post.userId, { uid: user.uid, streetName: userProfile?.streetName, avatar: userProfile?.avatar });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleReshare = async () => {
    if (!user || resharing || post.userId === user.uid) return;

    // Don't allow resharing your own posts or already reshared
    if (hasReshared) {
      alert('You have already reshared this post');
      return;
    }

    setResharing(true);

    try {
      // Create a reshare post
      const reshareData = {
        userId: user.uid,
        streetName: userProfile?.streetName || 'Unknown',
        userAvatar: userProfile?.avatar || '',
        mediaType: post.mediaType || 'none',
        mediaUrl: post.mediaUrl || '',
        caption: post.caption || '',
        hashtags: post.hashtags || [],
        likes: 0,
        likedBy: [],
        upvotes: 0,
        downvotes: 0,
        upvotedBy: [],
        downvotedBy: [],
        commentCount: 0,
        reshares: 0,
        resharedBy: [],
        // Mark as reshare with original post info
        isReshare: true,
        originalPostId: post.originalPostId || post.id,
        originalUserId: post.originalUserId || post.userId,
        originalStreetName: post.originalStreetName || post.streetName,
        originalUserAvatar: post.originalUserAvatar || post.userAvatar,
        createdAt: serverTimestamp()
      };

      // Include location if original had it (for alert posts with maps)
      if (post.location) {
        reshareData.location = post.location;
      }

      await addDoc(collection(db, 'posts'), reshareData);

      // Update original post reshare count
      const originalPostRef = doc(db, 'posts', post.originalPostId || post.id);
      await updateDoc(originalPostRef, {
        reshares: increment(1),
        resharedBy: arrayUnion(user.uid)
      });

      setReshareCount(prev => prev + 1);
      setHasReshared(true);
      alert('Post reshared!');
    } catch (error) {
      console.error('Error resharing post:', error);
      alert('Failed to reshare post');
    } finally {
      setResharing(false);
    }
  };

  // RideOut app URL
  const RIDEOUT_URL = 'https://rideout-crew.netlify.app';

  const getShareText = () => {
    return `Check out this sick ride by ${post.streetName} on RideOut! 🏍️⚡\n\nJoin the crew: ${RIDEOUT_URL}`;
  };

  const handleShare = async (platform) => {
    const shareText = getShareText();
    const postUrl = `${RIDEOUT_URL}/post/${post.id}`;

    switch (platform) {
      case 'snapchat':
        // Snapchat Creative Kit share URL
        const snapUrl = `https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(post.mediaUrl)}&caption=${encodeURIComponent(shareText)}`;
        window.open(snapUrl, '_blank');
        break;
      case 'tiktok':
        // TikTok doesn't have direct share URL, copy to clipboard and open TikTok
        await navigator.clipboard.writeText(`${shareText}\n\n${postUrl}`);
        // Open TikTok app or website
        window.open('https://www.tiktok.com/upload', '_blank');
        alert('Caption copied! Paste it in TikTok with your video.');
        break;
      case 'native':
        // Use Web Share API if available
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'RideOut - Electric Bike Community',
              text: shareText,
              url: postUrl
            });
          } catch (err) {
            console.log('Share cancelled');
          }
        } else {
          // Fallback - copy to clipboard
          await navigator.clipboard.writeText(`${shareText}\n\n${postUrl}`);
          alert('Link copied to clipboard!');
        }
        break;
      case 'copy':
        await navigator.clipboard.writeText(`${shareText}\n\n${postUrl}`);
        alert('Link copied to clipboard!');
        break;
    }
    setShowShareMenu(false);
  };

  const handleLike = async () => {
    if (!user) return;

    const wasLiked = liked;

    if (liked) {
      setLikes(prev => prev - 1);
      setLiked(false);
    } else {
      setLikes(prev => prev + 1);
      setLiked(true);
    }

    if (isDemo) {
      demoPosts.toggleLike(post.id, user.uid);
    } else {
      const postRef = doc(db, 'posts', post.id);
      if (wasLiked) {
        await updateDoc(postRef, {
          likes: increment(-1),
          likedBy: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(postRef, {
          likes: increment(1),
          likedBy: arrayUnion(user.uid)
        });
        // Send notification when liking (not unliking)
        if (post.userId !== user.uid) {
          notifyLike(post.userId, { uid: user.uid, streetName: userProfile?.streetName, avatar: userProfile?.avatar }, post);
          // Award points to post author
          awardLikeReceived(post.userId, user.uid, post.id);
        }
      }
    }
  };

  const handleVote = async (direction) => {
    if (!user) return;

    let newUpvoted = upvoted;
    let newDownvoted = downvoted;
    let scoreChange = 0;

    if (direction === 'up') {
      if (upvoted) {
        newUpvoted = false;
        scoreChange = -1;
      } else {
        newUpvoted = true;
        scoreChange = downvoted ? 2 : 1;
        newDownvoted = false;
      }
    } else {
      if (downvoted) {
        newDownvoted = false;
        scoreChange = 1;
      } else {
        newDownvoted = true;
        scoreChange = upvoted ? -2 : -1;
        newUpvoted = false;
      }
    }

    setUpvoted(newUpvoted);
    setDownvoted(newDownvoted);
    setVoteScore(prev => prev + scoreChange);

    if (isDemo) {
      demoPosts.vote(post.id, user.uid, direction);
    } else {
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        upvotes: increment(newUpvoted ? 1 : upvoted ? -1 : 0),
        downvotes: increment(newDownvoted ? 1 : downvoted ? -1 : 0),
        upvotedBy: newUpvoted ? arrayUnion(user.uid) : arrayRemove(user.uid),
        downvotedBy: newDownvoted ? arrayUnion(user.uid) : arrayRemove(user.uid)
      });
      // Send notification when upvoting (not removing or downvoting)
      if (direction === 'up' && newUpvoted && post.userId !== user.uid) {
        notifyUpvote(post.userId, { uid: user.uid, streetName: userProfile?.streetName, avatar: userProfile?.avatar }, post);
        // Award points to post author
        awardUpvoteReceived(post.userId, user.uid, post.id);
      }
    }
  };

  const handleReport = async () => {
    setShowMenu(false);
    if (onReport) {
      onReport(post);
    }
  };

  const handleDeletePost = async () => {
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'posts', post.id));
      setShowDeleteConfirm(false);
      // Optionally trigger a refresh or remove from UI
      if (onUpdate) {
        onUpdate();
      }
      // Navigate away or the parent will handle removing from list
      navigate('/feed');
    } catch (error) {
      console.error('Error deleting post:', error);
      setDeleting(false);
      setShowDeleteConfirm(false);
      alert('Failed to delete post. Please try again.');
    }
  };

  const formatCaption = (text) => {
    if (!text) return null;

    const parts = text.split(/(#\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return (
          <Link
            key={i}
            to={`/explore?tag=${part.slice(1)}`}
            className="text-neon-blue hover:underline"
          >
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  const timeAgo = (timestamp) => {
    if (!timestamp) return '';

    let date;
    if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }

    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return `${Math.floor(seconds / 604800)}w`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden"
    >
      {/* Reshare indicator */}
      {post.isReshare && (
        <div className="px-4 pt-3 pb-1 flex items-center gap-2 text-gray-500 text-sm">
          <Repeat2 size={14} />
          <span>{post.streetName} reshared</span>
          <Link to={`/profile/${post.originalUserId}`} className="text-neon-blue hover:underline">
            @{post.originalStreetName}
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Link to={`/profile/${post.userId}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-blue to-neon-green p-0.5">
              <div className="w-full h-full rounded-full bg-dark-bg overflow-hidden">
                {post.userAvatar ? (
                  <img src={post.userAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neon-blue font-bold">
                    {post.streetName?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link to={`/profile/${post.userId}`}>
              <p className="font-semibold text-white">{post.streetName}</p>
              <p className="text-xs text-gray-500">{timeAgo(post.createdAt)}</p>
            </Link>
            {/* Follow & Message Buttons */}
            {user && post.userId !== user.uid && (
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-all touch-manipulation ${
                    isFollowing
                      ? 'bg-dark-surface text-gray-400 border border-dark-border'
                      : 'bg-neon-blue text-dark-bg'
                  }`}
                >
                  {followLoading ? (
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : isFollowing ? (
                    <>
                      <UserCheck size={12} />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus size={12} />
                      Follow
                    </>
                  )}
                </button>
                <button
                  onClick={() => navigate(`/chat/new?user=${post.userId}`)}
                  className="p-1.5 rounded-full bg-dark-surface text-gray-400 hover:text-neon-green border border-dark-border transition-all touch-manipulation"
                >
                  <Send size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-500 hover:text-white rounded-full hover:bg-dark-surface transition-all"
          >
            <MoreHorizontal size={20} />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-dark-surface border border-dark-border rounded-xl overflow-hidden z-20 shadow-xl">
                {/* Edit & Delete - only for post owner */}
                {post.userId === user?.uid && (
                  <>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        navigate(`/edit-post/${post.id}`);
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-dark-card transition-all text-white"
                    >
                      <Pencil size={18} />
                      Edit Post
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-dark-card transition-all text-red-400"
                    >
                      <Trash2 size={18} />
                      Delete Post
                    </button>
                  </>
                )}
                {/* Report - for others */}
                {post.userId !== user?.uid && (
                  <>
                    <button
                      onClick={handleReport}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-dark-card transition-all text-red-400"
                    >
                      <Flag size={18} />
                      Report Post
                    </button>
                    <button
                      onClick={() => setShowMenu(false)}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-dark-card transition-all text-gray-300"
                    >
                      <UserX size={18} />
                      Block User
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Media - show image/video if available, or map if location exists */}
      {post.mediaUrl && post.mediaType !== 'none' ? (
        <div
          className="relative aspect-square bg-dark-bg cursor-pointer"
          onClick={() => navigate(`/post/${post.id}`)}
        >
          {post.mediaType === 'video' ? (
            <>
              <video
                src={post.mediaUrl}
                className="w-full h-full object-cover"
                loop
                muted
                playsInline
                autoPlay
                preload="auto"
                onCanPlay={(e) => {
                  // Pause immediately after it can play to show first frame
                  if (!isPlaying) {
                    e.target.pause();
                    e.target.currentTime = 0.1;
                  }
                }}
                onMouseEnter={(e) => {
                  e.target.play();
                  setIsPlaying(true);
                }}
                onMouseLeave={(e) => {
                  e.target.pause();
                  e.target.currentTime = 0.1;
                  setIsPlaying(false);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isPlaying) {
                    e.target.pause();
                    setIsPlaying(false);
                  } else {
                    e.target.play();
                    setIsPlaying(true);
                  }
                }}
              />
              {/* Render overlay elements for videos */}
              {post.overlayElements?.map(el => (
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
            </>
          ) : (
            <LazyImage
              src={post.mediaUrl}
              alt=""
              className="w-full h-full"
              aspectRatio="1/1"
            />
          )}
          {post.mediaType === 'video' && !isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-dark-bg/60 flex items-center justify-center backdrop-blur-sm">
                <div className="w-0 h-0 border-l-[20px] border-l-white border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1"></div>
              </div>
            </div>
          )}
          {/* Music indicator */}
          {post.music?.url && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleMusic(); }}
              className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/70 backdrop-blur rounded-full flex items-center gap-2 text-white text-sm"
            >
              <span>{post.music.icon}</span>
              <span className="max-w-20 truncate">{post.music.name}</span>
              {isMusicPlaying ? <Volume2 size={14} className="text-neon-blue" /> : <VolumeX size={14} />}
            </button>
          )}
        </div>
      ) : post.location?.lat && post.location?.lng ? (
        <div
          className="relative aspect-square bg-dark-bg cursor-pointer"
          onClick={() => navigate(`/post/${post.id}`)}
        >
          <img
            src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/geojson(${generateCircleGeoJSON(post.location.lng, post.location.lat)}),pin-s+ff3b30(${post.location.lng},${post.location.lat})/${post.location.lng},${post.location.lat},12,0/600x600@2x?access_token=pk.eyJ1IjoidHJveW03IiwiYSI6ImNta3M3bGw1azFiamEza3BweDJpMGswa3kifQ.P8EVLVOr4ChTrpkyCIg36A`}
            alt="Location"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-dark-bg/80 backdrop-blur rounded-lg text-xs text-gray-300 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            Alert Location (1.5km radius)
          </div>
        </div>
      ) : post.isTextOnly && (post.textContent || post.caption) ? (
        <div
          className="relative w-full cursor-pointer overflow-hidden"
          style={{
            background: post.textBackground || 'linear-gradient(135deg, #00D4FF 0%, #39FF14 100%)',
            aspectRatio: '1 / 1',
            minHeight: '300px'
          }}
          onClick={() => navigate(`/post/${post.id}`)}
        >
          {/* Text content - positioned or centered */}
          <p
            className={`absolute max-w-[90%] text-center leading-relaxed ${post.textFont || 'font-medium'}`}
            style={{
              left: post.textX ? `${post.textX}%` : '50%',
              top: post.textY ? `${post.textY}%` : '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: post.textSize ? `${post.textSize}px` : '24px',
              color: post.textColor || '#FFFFFF',
              textShadow: '2px 2px 8px rgba(0,0,0,0.5)'
            }}
          >
            {(post.textContent || post.caption).length > 280
              ? (post.textContent || post.caption).slice(0, 280) + '...'
              : (post.textContent || post.caption)}
          </p>

          {/* Stickers */}
          {post.textStickers?.map((sticker, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${sticker.x}%`,
                top: `${sticker.y}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: `${sticker.size || 40}px`
              }}
            >
              {sticker.emoji}
            </div>
          ))}

          {/* Music indicator */}
          {post.music && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleMusic(); }}
              className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/60 rounded-full flex items-center gap-2 text-white text-sm"
            >
              {isMusicPlaying ? <Volume2 size={16} /> : <Music size={16} />}
              <span className="max-w-20 truncate">{post.music.name}</span>
            </button>
          )}
        </div>
      ) : null}

      {/* Actions */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            {/* Like */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 transition-all ${
                liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
              }`}
            >
              <Heart size={24} fill={liked ? 'currentColor' : 'none'} />
              <span className="text-sm font-medium">{likes}</span>
            </button>

            {/* Comments */}
            <button
              onClick={() => navigate(`/post/${post.id}`)}
              className="flex items-center gap-1.5 text-gray-400 hover:text-neon-blue transition-all"
            >
              <MessageCircle size={24} />
              <span className="text-sm font-medium">{post.commentCount || 0}</span>
            </button>

            {/* Reshare */}
            <button
              onClick={handleReshare}
              disabled={resharing || hasReshared || post.userId === user?.uid}
              className={`flex items-center gap-1.5 transition-all ${
                post.userId === user?.uid
                  ? 'text-gray-600 cursor-not-allowed'
                  : hasReshared
                    ? 'text-neon-green'
                    : 'text-gray-400 hover:text-neon-green'
              }`}
            >
              <Repeat2 size={22} />
              {reshareCount > 0 && <span className="text-sm font-medium">{reshareCount}</span>}
            </button>

            {/* Share */}
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center gap-1.5 text-gray-400 hover:text-neon-green transition-all"
              >
                <Share2 size={22} />
              </button>

              {showShareMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowShareMenu(false)}
                  />
                  <div className="absolute left-0 bottom-full mb-2 w-56 bg-dark-surface border border-dark-border rounded-xl overflow-hidden z-20 shadow-xl">
                    <div className="px-4 py-2 border-b border-dark-border">
                      <p className="text-xs text-gray-500">Share to</p>
                    </div>

                    {/* Snapchat */}
                    <button
                      onClick={() => handleShare('snapchat')}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-dark-card transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
                          <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509-.022.405-.496 1.049-3.454 1.049-.116.044-.221.104-.389.344-.391.569-.823 1.213-1.333 1.748-.539.569-1.169.928-1.89.928h-.03c-.69 0-1.35-.33-1.89-.928-.51-.535-.943-1.18-1.333-1.748-.169-.24-.273-.3-.391-.344-2.957 0-3.431-.644-3.453-1.049-.015-.239.165-.465.42-.509 3.265-.539 4.731-3.878 4.791-4.014l.016-.015c.18-.344.21-.644.119-.868-.195-.45-.885-.675-1.333-.81-.136-.044-.256-.09-.345-.119-.823-.329-1.228-.719-1.213-1.168 0-.359.285-.689.735-.838.149-.061.327-.09.509-.09.119 0 .299.016.464.104.374.181.734.285 1.033.301.197 0 .326-.045.401-.09-.008-.165-.018-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.3-4.847C7.859 1.069 11.216.793 12.206.793z"/>
                        </svg>
                      </div>
                      <span className="text-white font-medium">Snapchat</span>
                    </button>

                    {/* TikTok */}
                    <button
                      onClick={() => handleShare('tiktok')}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-dark-card transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center border border-gray-700">
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
                          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                        </svg>
                      </div>
                      <span className="text-white font-medium">TikTok</span>
                    </button>

                    {/* More options */}
                    <button
                      onClick={() => handleShare('native')}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-dark-card transition-all border-t border-dark-border"
                    >
                      <div className="w-8 h-8 rounded-lg bg-neon-blue/20 flex items-center justify-center">
                        <ExternalLink size={18} className="text-neon-blue" />
                      </div>
                      <span className="text-white font-medium">More options</span>
                    </button>

                    {/* Copy link */}
                    <button
                      onClick={() => handleShare('copy')}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-dark-card transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-600/30 flex items-center justify-center">
                        <Copy size={18} className="text-gray-400" />
                      </div>
                      <span className="text-white font-medium">Copy link</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Vote */}
          <div className="flex items-center gap-1 bg-dark-surface rounded-full px-2 py-1">
            <button
              onClick={() => handleVote('up')}
              className={`p-1 rounded-full transition-all ${
                upvoted ? 'text-neon-green bg-neon-green/20' : 'text-gray-500 hover:text-neon-green'
              }`}
            >
              <ChevronUp size={20} />
            </button>
            <span className={`min-w-[2rem] text-center text-sm font-bold ${
              voteScore > 0 ? 'text-neon-green' : voteScore < 0 ? 'text-red-500' : 'text-gray-400'
            }`}>
              {voteScore}
            </span>
            <button
              onClick={() => handleVote('down')}
              className={`p-1 rounded-full transition-all ${
                downvoted ? 'text-red-500 bg-red-500/20' : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <ChevronDown size={20} />
            </button>
          </div>
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="text-white text-sm">
            <Link to={`/profile/${post.userId}`} className="font-semibold hover:underline mr-2">
              {post.streetName}
            </Link>
            {formatCaption(post.caption)}
          </p>
        )}

        {/* First Comment Preview */}
        {firstComment && (
          <div className="mt-2 flex items-center gap-2">
            <Link to={`/profile/${firstComment.userId}`} className="w-6 h-6 rounded-full bg-dark-surface flex-shrink-0 overflow-hidden flex items-center justify-center">
              {firstComment.userAvatar ? (
                <img src={firstComment.userAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-neon-blue">{firstComment.streetName?.charAt(0)}</span>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300 truncate">
                <Link to={`/profile/${firstComment.userId}`} className="font-semibold text-white hover:underline mr-1">
                  {firstComment.streetName}
                </Link>
                {firstComment.text}
              </p>
            </div>
            <button
              onClick={() => handleCommentLike(firstComment)}
              className={`flex-shrink-0 p-1 ${
                firstComment.likedBy?.includes(user?.uid)
                  ? 'text-red-500'
                  : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <Heart size={14} fill={firstComment.likedBy?.includes(user?.uid) ? 'currentColor' : 'none'} />
            </button>
          </div>
        )}

        {/* View all comments link */}
        {(post.commentCount || 0) > 1 && (
          <button
            onClick={() => navigate(`/post/${post.id}`)}
            className="text-sm text-gray-500 hover:text-gray-400 mt-1"
          >
            View all {post.commentCount} comments
          </button>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-dark-card border border-dark-border rounded-2xl p-6 max-w-sm w-full"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Delete Post?</h3>
            <p className="text-gray-400 text-sm mb-6">This action cannot be undone. Your post will be permanently removed.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl font-medium bg-dark-surface text-gray-300 border border-dark-border"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePost}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl font-medium bg-red-500 text-white flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default memo(PostCard);
