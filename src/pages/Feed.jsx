import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Bell, RefreshCw, Calendar, ChevronRight, UserPlus, Send, Search, X, UserCheck, Trophy } from 'lucide-react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  doc,
  getDoc,
  addDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { demoPosts } from '../utils/demoStore';
import PostCard from '../components/PostCard';
import ReportModal from '../components/ReportModal';
import InviteModal from '../components/InviteModal';

// Search functionality added
const Feed = () => {
  const { user, userProfile, isDemo } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [reportingPost, setReportingPost] = useState(null);
  const [following, setFollowing] = useState([]);
  const [showInvite, setShowInvite] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [followingIds, setFollowingIds] = useState([]);

  const fetchFollowing = useCallback(async () => {
    if (!user) return [];
    if (isDemo) return ['demo-user-2', 'demo-user-3', 'demo-user-4'];

    try {
      const followsQuery = query(
        collection(db, 'follows'),
        where('followerId', '==', user.uid)
      );
      const snapshot = await getDocs(followsQuery);
      return snapshot.docs.map(doc => doc.data().followingId);
    } catch (error) {
      console.error('Error fetching following:', error);
      return [];
    }
  }, [user, isDemo]);

  const fetchPosts = useCallback(async (followingIds, lastDocument = null) => {
    if (isDemo) {
      // Return demo posts
      return { docs: demoPosts.getAll().map(p => ({ id: p.id, data: () => p })) };
    }

    if (followingIds.length === 0) {
      const postsQuery = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );

      if (lastDocument) {
        const postsQueryPaginated = query(
          collection(db, 'posts'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDocument),
          limit(10)
        );
        return getDocs(postsQueryPaginated);
      }

      return getDocs(postsQuery);
    }

    const userIds = [...followingIds, user.uid];

    const postsQuery = lastDocument
      ? query(
          collection(db, 'posts'),
          where('userId', 'in', userIds.slice(0, 10)),
          orderBy('createdAt', 'desc'),
          startAfter(lastDocument),
          limit(10)
        )
      : query(
          collection(db, 'posts'),
          where('userId', 'in', userIds.slice(0, 10)),
          orderBy('createdAt', 'desc'),
          limit(10)
        );

    return getDocs(postsQuery);
  }, [user, isDemo]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const followingIds = await fetchFollowing();
      setFollowing(followingIds);

      const snapshot = await fetchPosts(followingIds);
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(typeof doc.data === 'function' ? doc.data() : doc)
      }));

      setPosts(postsData);
      if (!isDemo) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 10);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchFollowing, fetchPosts, isDemo]);

  const loadMorePosts = async () => {
    if (loadingMore || !hasMore || !lastDoc || isDemo) return;

    setLoadingMore(true);
    try {
      const snapshot = await fetchPosts(following, lastDoc);
      const newPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setPosts(prev => [...prev, ...newPosts]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === 10);
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 500
      ) {
        loadMorePosts();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastDoc, hasMore, loadingMore, following]);

  const handlePostUpdate = (postId, updates) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates } : p));
  };

  // Fetch all users for search
  const fetchAllUsers = async () => {
    try {
      const usersQuery = query(collection(db, 'users'));
      const snapshot = await getDocs(usersQuery);
      const users = snapshot.docs
        .filter(d => d.id !== user?.uid)
        .map(d => ({ id: d.id, ...d.data() }));
      setAllUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Fetch who the user is following
  const fetchFollowingIds = async () => {
    if (!user) return;
    try {
      const followsQuery = query(
        collection(db, 'follows'),
        where('followerId', '==', user.uid)
      );
      const snapshot = await getDocs(followsQuery);
      setFollowingIds(snapshot.docs.map(d => d.data().followingId));
    } catch (error) {
      console.error('Error fetching following:', error);
    }
  };

  // Handle follow/unfollow
  const handleFollow = async (targetUserId) => {
    if (!user) return;
    try {
      if (followingIds.includes(targetUserId)) {
        // Unfollow
        const followsQuery = query(
          collection(db, 'follows'),
          where('followerId', '==', user.uid),
          where('followingId', '==', targetUserId)
        );
        const snapshot = await getDocs(followsQuery);
        if (!snapshot.empty) {
          await deleteDoc(snapshot.docs[0].ref);
        }
        setFollowingIds(prev => prev.filter(id => id !== targetUserId));
      } else {
        // Follow
        await addDoc(collection(db, 'follows'), {
          followerId: user.uid,
          followingId: targetUserId,
          createdAt: serverTimestamp()
        });
        setFollowingIds(prev => [...prev, targetUserId]);
      }
    } catch (error) {
      console.error('Error following/unfollowing:', error);
    }
  };

  // Open search modal
  const openSearch = () => {
    fetchAllUsers();
    fetchFollowingIds();
    setShowSearch(true);
  };

  // Filter users based on search
  const searchResults = searchQuery.trim()
    ? allUsers.filter(u => u.streetName?.toLowerCase().includes(searchQuery.toLowerCase()))
    : allUsers;

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-bg/95 backdrop-blur-lg border-b border-dark-border safe-top">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-blue to-neon-green p-0.5">
              <div className="w-full h-full rounded-lg bg-dark-bg flex items-center justify-center">
                <Zap size={18} className="text-neon-blue" fill="currentColor" />
              </div>
            </div>
            <h1 className="text-2xl font-display tracking-wider">RIDEOUT</h1>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={openSearch}
              className="p-2 text-neon-green rounded-full bg-dark-card transition-all"
            >
              <Search size={24} />
            </button>
            <Link
              to="/leaderboard"
              className="p-2 text-yellow-500 rounded-full hover:bg-dark-card transition-all"
            >
              <Trophy size={22} />
            </Link>
            <button
              onClick={() => setShowInvite(true)}
              className="p-2 text-gray-400 hover:text-neon-green rounded-full hover:bg-dark-card transition-all"
            >
              <UserPlus size={20} />
            </button>
            <button
              onClick={loadPosts}
              className="p-2 text-gray-400 hover:text-neon-blue rounded-full hover:bg-dark-card transition-all"
            >
              <RefreshCw size={20} />
            </button>
            <Link
              to="/notifications"
              className="p-2 text-gray-400 hover:text-neon-blue rounded-full hover:bg-dark-card transition-all relative"
            >
              <Bell size={20} />
            </Link>
            <Link
              to="/messages"
              className="p-2 text-gray-400 hover:text-neon-blue rounded-full hover:bg-dark-card transition-all"
            >
              <Send size={20} />
            </Link>
          </div>
        </div>
      </header>

      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="bg-neon-blue/20 border-b border-neon-blue/30 px-4 py-2">
          <p className="text-center text-sm text-neon-blue">Demo Mode - Posts are stored locally</p>
        </div>
      )}

      {/* RideOut Announcements Banner */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <Link to="/rides">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-neon-blue/20 to-neon-green/20 border border-neon-blue/30 rounded-2xl p-4 flex items-center gap-3"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-blue to-neon-green flex items-center justify-center">
              <Calendar size={24} className="text-dark-bg" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white">RideOut Events</h3>
              <p className="text-sm text-gray-400">Join group rides near you</p>
            </div>
            <ChevronRight size={24} className="text-neon-blue" />
          </motion.div>
        </Link>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-dark-card rounded-2xl overflow-hidden">
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full skeleton"></div>
                  <div className="flex-1">
                    <div className="h-4 w-24 skeleton rounded"></div>
                    <div className="h-3 w-16 skeleton rounded mt-1"></div>
                  </div>
                </div>
                <div className="aspect-square skeleton"></div>
                <div className="p-4">
                  <div className="h-4 w-32 skeleton rounded"></div>
                  <div className="h-4 w-full skeleton rounded mt-2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 rounded-full bg-dark-card mx-auto mb-4 flex items-center justify-center">
              <Zap size={40} className="text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Your feed is empty</h3>
            <p className="text-gray-500 mb-6">Follow some riders or create your first post</p>
            <Link
              to="/create"
              className="inline-block px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-green text-dark-bg font-bold rounded-xl hover:shadow-neon-blue transition-all"
            >
              Create Post
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {posts.map((post, index) => (
              <PostCard
                key={post.id}
                post={post}
                onReport={() => setReportingPost(post)}
                onUpdate={(updates) => handlePostUpdate(post.id, updates)}
              />
            ))}

            {loadingMore && (
              <div className="py-4 flex justify-center">
                <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <p className="text-center text-gray-500 py-4">
                You've seen all the posts
              </p>
            )}
          </div>
        )}
      </div>

      {/* Report Modal */}
      {reportingPost && (
        <ReportModal
          post={reportingPost}
          onClose={() => setReportingPost(null)}
        />
      )}

      {/* Invite Modal */}
      <InviteModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
      />

      {/* Search Modal */}
      {showSearch && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50"
        >
          <div className="h-full flex flex-col max-w-lg mx-auto">
            {/* Header */}
            <div className="p-4 border-b border-dark-border flex items-center gap-3">
              <button
                onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                className="p-2 -ml-2 text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search riders..."
                autoFocus
                className="flex-1 px-4 py-2 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-blue"
              />
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto p-4">
              {allUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Search size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Loading riders...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No riders found</p>
                </div>
              ) : (
                searchResults.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 p-3 hover:bg-dark-card rounded-xl transition-all"
                  >
                    <Link
                      to={`/profile/${u.id}`}
                      onClick={() => setShowSearch(false)}
                      className="flex items-center gap-3 flex-1"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-blue to-neon-green p-0.5">
                        <div className="w-full h-full rounded-full bg-dark-bg overflow-hidden flex items-center justify-center">
                          {u.avatar ? (
                            <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-bold text-neon-blue">{u.streetName?.charAt(0)}</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold">{u.streetName}</p>
                        <p className="text-sm text-gray-500">{u.bike || 'Rider'}</p>
                      </div>
                    </Link>
                    <button
                      onClick={() => handleFollow(u.id)}
                      className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                        followingIds.includes(u.id)
                          ? 'bg-dark-surface text-gray-400 border border-dark-border'
                          : 'bg-neon-blue text-dark-bg'
                      }`}
                    >
                      {followingIds.includes(u.id) ? (
                        <>
                          <UserCheck size={16} />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} />
                          Follow
                        </>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Feed;
