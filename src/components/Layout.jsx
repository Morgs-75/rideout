import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { Home, Map, PlusSquare, MessageCircle, User, Search, X, UserPlus, UserCheck } from 'lucide-react';
import { collection, query, getDocs, where, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const Layout = () => {
  const { user } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [followingIds, setFollowingIds] = useState([]);

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

  const handleFollow = async (targetUserId) => {
    if (!user) return;
    try {
      if (followingIds.includes(targetUserId)) {
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

  const openSearch = () => {
    fetchAllUsers();
    fetchFollowingIds();
    setShowSearch(true);
  };

  const searchResults = searchQuery.trim()
    ? allUsers.filter(u => u.streetName?.toLowerCase().includes(searchQuery.toLowerCase()))
    : allUsers;

  const navItems = [
    { to: '/feed', icon: Home, label: 'Feed' },
    { to: '/map', icon: Map, label: 'Maps' },
    { to: '/create', icon: PlusSquare, label: 'Create' },
    { to: '/messages', icon: MessageCircle, label: 'Messages' },
    { to: `/profile/${user?.uid}`, icon: User, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Main Content */}
      <main className="pb-20">
        <Outlet />
      </main>

      {/* Floating Search Button */}
      <button
        onClick={openSearch}
        className="fixed bottom-24 right-4 z-50 w-14 h-14 bg-gradient-to-r from-neon-blue to-neon-green rounded-full flex items-center justify-center shadow-lg"
        style={{ boxShadow: '0 0 20px rgba(0, 212, 255, 0.5)' }}
      >
        <Search size={24} className="text-dark-bg" />
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-dark-card/95 backdrop-blur-lg border-t border-dark-border safe-bottom z-50">
        <div className="max-w-lg mx-auto flex justify-around items-center py-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center p-2 transition-all duration-200 ${
                  isActive
                    ? 'text-neon-blue'
                    : 'text-gray-500 hover:text-gray-300'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`relative ${isActive ? 'animate-pulse' : ''}`}>
                    {label === 'Create' ? (
                      <div className={`p-2 rounded-xl ${isActive ? 'bg-neon-blue' : 'bg-gradient-to-r from-neon-blue to-neon-green'}`}>
                        <Icon size={22} className="text-dark-bg" />
                      </div>
                    ) : (
                      <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                    )}
                    {isActive && label !== 'Create' && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-neon-blue shadow-neon-blue"></div>
                    )}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium ${label === 'Create' ? 'opacity-0' : ''}`}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Search Modal */}
      {showSearch && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100]"
        >
          <div className="h-full flex flex-col max-w-lg mx-auto">
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

export default Layout;
