import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PenSquare, Search, Users } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Use real-time subscription for conversations
    const convQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(convQuery, (snapshot) => {
      const convs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by lastMessageAt on client side to avoid composite index requirement
      convs.sort((a, b) => {
        const aTime = a.lastMessageAt?.toDate?.()?.getTime() || 0;
        const bTime = b.lastMessageAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
      setConversations(convs);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching conversations:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const timeAgo = (timestamp) => {
    if (!timestamp) return '';
    const seconds = Math.floor((Date.now() - timestamp.toDate()) / 1000);
    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="sticky top-0 z-40 bg-dark-bg/95 backdrop-blur-lg border-b border-dark-border safe-top">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-display tracking-wider">MESSAGES</h1>
          <button onClick={() => navigate('/chat/new')} className="p-2 text-neon-blue"><PenSquare size={22} /></button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="flex gap-3 p-3"><div className="w-14 h-14 rounded-full skeleton"></div><div className="flex-1"><div className="h-4 w-24 skeleton rounded mb-2"></div><div className="h-3 w-full skeleton rounded"></div></div></div>)}</div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-dark-card mx-auto mb-4 flex items-center justify-center"><Users size={40} className="text-gray-600" /></div>
            <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
            <p className="text-gray-500 mb-6">Start a conversation with a rider</p>
            <button onClick={() => navigate('/chat/new')} className="px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-green text-dark-bg font-bold rounded-xl">New Message</button>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <Link key={conv.id} to={`/chat/${conv.id}`} className="flex items-center gap-3 p-3 bg-dark-card border border-dark-border rounded-xl hover:border-neon-blue transition-all">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-neon-blue to-neon-green p-0.5 flex-shrink-0">
                  <div className="w-full h-full rounded-full bg-dark-bg flex items-center justify-center">
                    {conv.isGroup ? <Users size={24} className="text-neon-blue" /> : <span className="text-lg font-bold text-neon-blue">{conv.otherUserName?.charAt(0) || '?'}</span>}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-semibold truncate">{conv.isGroup ? conv.groupName : conv.otherUserName}</p>
                    <span className="text-xs text-gray-500">{timeAgo(conv.lastMessageAt)}</span>
                  </div>
                  <p className="text-sm text-gray-400 truncate">{conv.lastMessage}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
