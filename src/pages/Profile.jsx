import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, Grid, MessageCircle, UserPlus, UserMinus, MapPin, Zap, TrendingUp } from 'lucide-react';
import { doc, getDoc, collection, query, where, orderBy, getDocs, addDoc, deleteDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { getUserPoints } from '../services/pointsService';
import { getTier, getProgressToNextTier, getNextTier, formatPoints } from '../config/gamification';

const Profile = () => {
  const { userId } = useParams();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [userPoints, setUserPoints] = useState(null);

  const isOwnProfile = user?.uid === userId;

  useEffect(() => {
    fetchProfile();
    fetchPosts();
    fetchPoints();
    if (!isOwnProfile && user) checkFollowStatus();
  }, [userId, user]);

  const fetchPoints = async () => {
    try {
      const points = await getUserPoints(userId);
      setUserPoints(points);
    } catch (error) {
      console.error('Error fetching points:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) setProfile({ id: userDoc.id, ...userDoc.data() });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const postsQuery = query(collection(db, 'posts'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(postsQuery);
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    try {
      const followQuery = query(collection(db, 'follows'), where('followerId', '==', user.uid), where('followingId', '==', userId));
      const snapshot = await getDocs(followQuery);
      setIsFollowing(!snapshot.empty);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleFollow = async () => {
    if (!user || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        const followQuery = query(collection(db, 'follows'), where('followerId', '==', user.uid), where('followingId', '==', userId));
        const snapshot = await getDocs(followQuery);
        snapshot.docs.forEach(async (d) => await deleteDoc(doc(db, 'follows', d.id)));
        await updateDoc(doc(db, 'users', userId), { followers: increment(-1) });
        await updateDoc(doc(db, 'users', user.uid), { following: increment(-1) });
        setIsFollowing(false);
        setProfile(p => ({ ...p, followers: (p.followers || 1) - 1 }));
      } else {
        await addDoc(collection(db, 'follows'), { followerId: user.uid, followingId: userId, createdAt: serverTimestamp() });
        await updateDoc(doc(db, 'users', userId), { followers: increment(1) });
        await updateDoc(doc(db, 'users', user.uid), { following: increment(1) });
        setIsFollowing(true);
        setProfile(p => ({ ...p, followers: (p.followers || 0) + 1 }));
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  if (!profile && !loading) return <div className="min-h-screen bg-dark-bg flex items-center justify-center text-gray-500">User not found</div>;

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="sticky top-0 z-40 bg-dark-bg/95 backdrop-blur-lg border-b border-dark-border safe-top">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold">{profile?.streetName || 'Profile'}</h1>
          {isOwnProfile && <Link to="/settings" className="p-2 text-gray-400 hover:text-white"><Settings size={24} /></Link>}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="flex items-start gap-6 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-neon-blue to-neon-green p-0.5 flex-shrink-0">
            <div className="w-full h-full rounded-full bg-dark-bg overflow-hidden flex items-center justify-center">
              {profile?.avatar ? <img src={profile.avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-3xl font-bold text-neon-blue">{profile?.streetName?.charAt(0).toUpperCase()}</span>}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex gap-6 mb-3">
              <div className="text-center"><p className="font-bold text-lg">{posts.length}</p><p className="text-xs text-gray-500">Posts</p></div>
              <div className="text-center"><p className="font-bold text-lg">{profile?.followers || 0}</p><p className="text-xs text-gray-500">Followers</p></div>
              <div className="text-center"><p className="font-bold text-lg">{profile?.following || 0}</p><p className="text-xs text-gray-500">Following</p></div>
            </div>
          </div>
        </div>

        {/* Tier & Points */}
        {userPoints && (() => {
          const tier = getTier(userPoints.lifetimePoints || 0);
          const nextTier = getNextTier(userPoints.lifetimePoints || 0);
          const progress = getProgressToNextTier(userPoints.lifetimePoints || 0);
          return (
            <div className="mb-4 p-3 bg-dark-card rounded-xl border border-dark-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium"
                    style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
                  >
                    <span>{tier.icon}</span>
                    <span>{tier.name}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1 text-neon-green">
                  <Zap size={16} />
                  <span className="font-bold">{formatPoints(userPoints.lifetimePoints || 0)}</span>
                  <span className="text-xs text-gray-500">pts</span>
                </div>
              </div>
              {nextTier && (
                <div className="space-y-1">
                  <div className="h-1.5 bg-dark-surface rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${tier.color}, ${nextTier.color})` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{formatPoints(nextTier.min - (userPoints.lifetimePoints || 0))} pts to {nextTier.name}</span>
                    <span className="flex items-center gap-1"><TrendingUp size={10} />{progress}%</span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Bio & Bike */}
        {profile?.bio && <p className="text-sm mb-2">{profile.bio}</p>}
        {profile?.bike && <p className="text-sm text-neon-green mb-4">🏍️ {profile.bike}</p>}

        {/* Actions */}
        <div className="flex gap-3 mb-6">
          {isOwnProfile ? (
            <Link to="/edit-profile" className="flex-1 py-2.5 bg-dark-card border border-dark-border rounded-xl text-center font-semibold hover:bg-dark-surface transition-all">Edit Profile</Link>
          ) : (
            <>
              <button onClick={handleFollow} disabled={followLoading} className={`flex-1 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${isFollowing ? 'bg-dark-card border border-dark-border' : 'bg-neon-blue text-dark-bg'}`}>
                {isFollowing ? <><UserMinus size={18} />Following</> : <><UserPlus size={18} />Follow</>}
              </button>
              <button onClick={() => navigate(`/chat/new?user=${userId}`)} className="px-4 py-2.5 bg-dark-card border border-dark-border rounded-xl"><MessageCircle size={20} /></button>
            </>
          )}
        </div>

        {/* Posts Grid */}
        <div className="border-t border-dark-border pt-4">
          <div className="flex items-center gap-2 text-gray-400 mb-4"><Grid size={18} /><span className="text-sm font-medium">POSTS</span></div>
          {loading ? (
            <div className="grid grid-cols-3 gap-1">{[1,2,3,4,5,6].map(i => <div key={i} className="aspect-square skeleton"></div>)}</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">{isOwnProfile ? 'Share your first ride!' : 'No posts yet'}</div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((post) => (
                <Link key={post.id} to={`/post/${post.id}`} className="aspect-square bg-dark-card overflow-hidden relative">
                  {post.mediaType === 'video' ? <video src={post.mediaUrl} className="w-full h-full object-cover" muted /> : <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />}
                  {post.location && <div className="absolute bottom-1 left-1 p-1 bg-black/50 rounded"><MapPin size={12} className="text-neon-blue" /></div>}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
