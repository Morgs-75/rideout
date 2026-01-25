import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, TrendingUp, Users, MapPin, Hash, ShoppingBag } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../config/firebase';

const Explore = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tagParam = searchParams.get('tag');
  
  const [searchQuery, setSearchQuery] = useState(tagParam ? `#${tagParam}` : '');
  const [activeTab, setActiveTab] = useState(tagParam ? 'hashtags' : 'trending');
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [trendingTags, setTrendingTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tagParam) searchByHashtag(tagParam);
    else fetchTrendingContent();
  }, [tagParam]);

  const fetchTrendingContent = async () => {
    setLoading(true);
    try {
      const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(30));
      const postsSnapshot = await getDocs(postsQuery);
      const postsData = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(postsData);

      const tagCount = {};
      postsData.forEach(post => {
        post.hashtags?.forEach(tag => { tagCount[tag] = (tagCount[tag] || 0) + 1; });
      });
      setTrendingTags(Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag, count]) => ({ tag, count })));

      const usersQuery = query(collection(db, 'users'), limit(10));
      const usersSnapshot = await getDocs(usersQuery);
      setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchByHashtag = async (tag) => {
    setLoading(true);
    try {
      const postsQuery = query(collection(db, 'posts'), where('hashtags', 'array-contains', tag.toLowerCase()), limit(30));
      const snapshot = await getDocs(postsQuery);
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.startsWith('#') && searchQuery.length > 1) {
      navigate(`/explore?tag=${searchQuery.slice(1)}`);
    }
  };

  const tabs = [
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'riders', label: 'Riders', icon: Users },
    { id: 'hashtags', label: 'Tags', icon: Hash },
    { id: 'map', label: 'Map', icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="sticky top-0 z-40 bg-dark-bg/95 backdrop-blur-lg border-b border-dark-border safe-top">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-xl font-display tracking-wider mb-3">EXPLORE</h1>
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search #hashtags..." className="w-full pl-12 pr-4 py-3 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-blue transition-all" />
            </div>
          </form>
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => tab.id === 'map' ? navigate('/map') : setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-neon-blue text-dark-bg font-semibold' : 'bg-dark-card text-gray-400'}`}>
                <tab.icon size={16} />{tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Merch Banner */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-hot-orange via-hot-magenta to-neon-blue p-0.5 mb-6">
          <div className="bg-dark-card rounded-2xl p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center">
              <ShoppingBag size={28} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-display text-lg tracking-wider">RIDEOUT MERCH</p>
              <p className="text-sm text-gray-400">Coming Soon — Rep the crew</p>
            </div>
            <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold">SOON</div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <>
            {activeTab === 'hashtags' && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">TRENDING TAGS</h3>
                <div className="flex flex-wrap gap-2">
                  {trendingTags.map(({ tag, count }) => (
                    <Link key={tag} to={`/explore?tag=${tag}`} className="px-4 py-2 bg-dark-card border border-dark-border rounded-full hover:border-neon-blue transition-all">
                      <span className="text-neon-blue">#{tag}</span>
                      <span className="text-gray-500 text-sm ml-2">{count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'riders' && (
              <div className="space-y-3 mb-6">
                {users.map((rider) => (
                  <Link key={rider.id} to={`/profile/${rider.id}`} className="flex items-center gap-3 p-3 bg-dark-card border border-dark-border rounded-xl hover:border-neon-blue transition-all">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-blue to-neon-green p-0.5">
                      <div className="w-full h-full rounded-full bg-dark-bg overflow-hidden flex items-center justify-center">
                        {rider.avatar ? <img src={rider.avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-neon-blue font-bold">{rider.streetName?.charAt(0).toUpperCase()}</span>}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{rider.streetName}</p>
                      <p className="text-sm text-gray-500">{rider.bike || 'Electric Rider'}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {(activeTab === 'trending' || activeTab === 'hashtags') && (
              <>
                {tagParam && <div className="mb-4"><h2 className="text-lg font-semibold">#{tagParam}</h2><p className="text-sm text-gray-500">{posts.length} posts</p></div>}
                <div className="grid grid-cols-3 gap-1">
                  {posts.map((post) => (
                    <Link key={post.id} to={`/post/${post.id}`} className="aspect-square bg-dark-card overflow-hidden relative group">
                      {post.mediaType === 'video' ? <video src={post.mediaUrl} className="w-full h-full object-cover" muted /> : <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-sm">❤️ {post.likes || 0}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Explore;
