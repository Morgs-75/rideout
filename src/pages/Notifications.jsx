import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, UserPlus, ChevronUp, Bell } from 'lucide-react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production, fetch from notifications collection
    // For now, showing placeholder
    setLoading(false);
    setNotifications([
      { id: '1', type: 'like', userName: 'VoltKing', userAvatar: '', postId: '123', createdAt: new Date(Date.now() - 300000) },
      { id: '2', type: 'follow', userName: 'SpeedDemon', userAvatar: '', userId: '456', createdAt: new Date(Date.now() - 3600000) },
      { id: '3', type: 'comment', userName: 'NightRider', userAvatar: '', postId: '789', text: 'Sick ride!', createdAt: new Date(Date.now() - 86400000) },
    ]);
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'like': return <Heart size={20} className="text-red-500" fill="currentColor" />;
      case 'follow': return <UserPlus size={20} className="text-neon-blue" />;
      case 'comment': return <MessageCircle size={20} className="text-neon-green" />;
      case 'upvote': return <ChevronUp size={20} className="text-neon-green" />;
      default: return <Bell size={20} className="text-gray-500" />;
    }
  };

  const getMessage = (notif) => {
    switch (notif.type) {
      case 'like': return 'liked your post';
      case 'follow': return 'started following you';
      case 'comment': return `commented: "${notif.text}"`;
      case 'upvote': return 'upvoted your post';
      default: return 'interacted with you';
    }
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((Date.now() - date) / 1000);
    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="sticky top-0 z-40 bg-dark-bg/95 backdrop-blur-lg border-b border-dark-border safe-top">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-xl font-display tracking-wider">ACTIVITY</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="flex gap-3 p-3"><div className="w-12 h-12 rounded-full skeleton"></div><div className="flex-1"><div className="h-4 w-full skeleton rounded"></div></div></div>)}</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-dark-card mx-auto mb-4 flex items-center justify-center"><Bell size={40} className="text-gray-600" /></div>
            <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
            <p className="text-gray-500">When someone interacts with your posts, you'll see it here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <motion.div key={notif.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 p-3 bg-dark-card border border-dark-border rounded-xl">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-blue to-neon-green p-0.5 flex-shrink-0">
                  <div className="w-full h-full rounded-full bg-dark-bg flex items-center justify-center">
                    {notif.userAvatar ? <img src={notif.userAvatar} alt="" className="w-full h-full object-cover rounded-full" /> : <span className="font-bold text-neon-blue">{notif.userName?.charAt(0)}</span>}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm"><span className="font-semibold">{notif.userName}</span> {getMessage(notif)}</p>
                  <p className="text-xs text-gray-500">{timeAgo(notif.createdAt)}</p>
                </div>
                <div className="flex-shrink-0">{getIcon(notif.type)}</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
