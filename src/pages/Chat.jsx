import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Users, UserPlus, Info } from 'lucide-react';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

const Chat = () => {
  const { chatId } = useParams();
  const [searchParams] = useSearchParams();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isNewChat, setIsNewChat] = useState(chatId === 'new');

  useEffect(() => {
    if (chatId !== 'new') {
      fetchConversation();
      const unsubscribe = subscribeToMessages();
      return () => unsubscribe?.();
    } else {
      setLoading(false);
      fetchAllUsers();
      const targetUser = searchParams.get('user');
      if (targetUser) fetchUserForNewChat(targetUser);
    }
  }, [chatId]);

  const fetchAllUsers = async () => {
    try {
      const usersQuery = query(collection(db, 'users'));
      const snapshot = await getDocs(usersQuery);
      const users = snapshot.docs
        .filter(d => d.id !== user.uid)
        .map(d => ({ id: d.id, ...d.data() }));
      setAllUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchUserForNewChat = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) setSelectedUsers([{ id: userDoc.id, ...userDoc.data() }]);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchConversation = async () => {
    try {
      const convDoc = await getDoc(doc(db, 'conversations', chatId));
      if (convDoc.exists()) setConversation({ id: convDoc.id, ...convDoc.data() });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const messagesQuery = query(collection(db, 'conversations', chatId, 'messages'), orderBy('createdAt', 'asc'));
    return onSnapshot(messagesQuery, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
  };

  // Filter users based on search query
  const displayedUsers = searchQuery.trim()
    ? allUsers.filter(u => u.streetName?.toLowerCase().includes(searchQuery.toLowerCase()))
    : allUsers;

  const handleSelectUser = (selectedUser) => {
    if (selectedUsers.length >= 5) return;
    if (!selectedUsers.find(u => u.id === selectedUser.id)) {
      setSelectedUsers([...selectedUsers, selectedUser]);
    }
    setSearchQuery('');
  };

  const [starting, setStarting] = useState(false);

  const startConversation = async () => {
    if (selectedUsers.length === 0 || starting) return;
    setStarting(true);

    try {
      const participants = [user.uid, ...selectedUsers.map(u => u.id)];
      const isGroup = selectedUsers.length > 1;

      // Check for existing DM
      if (!isGroup) {
        let existingConvId = null;
        try {
          const existingQuery = query(collection(db, 'conversations'), where('participants', 'array-contains', user.uid));
          const existing = await getDocs(existingQuery);
          const found = existing.docs.find(d => {
            const data = d.data();
            return !data.isGroup && data.participants.includes(selectedUsers[0].id);
          });
          if (found) {
            existingConvId = found.id;
          }
        } catch (queryError) {
          console.log('Query error (continuing to create new):', queryError);
        }

        if (existingConvId) {
          window.location.href = `/chat/${existingConvId}`;
          return;
        }
      }

      const convData = {
        participants,
        isGroup,
        groupName: isGroup ? selectedUsers.map(u => u.streetName).join(', ') : null,
        otherUserName: !isGroup ? selectedUsers[0].streetName : null,
        otherUserId: !isGroup ? selectedUsers[0].id : null,
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp()
      };

      const convRef = await addDoc(collection(db, 'conversations'), convData);
      window.location.href = `/chat/${convRef.id}`;
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Failed to start chat: ' + error.message);
      setStarting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const messageText = newMessage.trim();
    setNewMessage(''); // Clear immediately for better UX
    try {
      const messageData = { senderId: user.uid, senderName: userProfile?.streetName || 'Unknown', text: messageText, createdAt: serverTimestamp() };
      await addDoc(collection(db, 'conversations', chatId, 'messages'), messageData);
      await updateDoc(doc(db, 'conversations', chatId), { lastMessage: messageText, lastMessageAt: serverTimestamp() });
    } catch (error) {
      console.error('Error:', error);
      setNewMessage(messageText); // Restore on error
    }
  };

  if (loading) return <div className="min-h-screen bg-dark-bg flex items-center justify-center"><div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      <header className="sticky top-0 z-40 bg-dark-bg/95 backdrop-blur-lg border-b border-dark-border safe-top">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/messages')} className="p-2 -ml-2 text-gray-400 hover:text-white"><ArrowLeft size={24} /></button>
          {isNewChat ? (
            <h1 className="font-semibold">New Message</h1>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-blue to-neon-green p-0.5">
                <div className="w-full h-full rounded-full bg-dark-bg flex items-center justify-center">
                  {conversation?.isGroup ? <Users size={20} className="text-neon-blue" /> : <span className="font-bold text-neon-blue">{conversation?.otherUserName?.charAt(0)}</span>}
                </div>
              </div>
              <p className="font-semibold">{conversation?.isGroup ? conversation.groupName : conversation?.otherUserName}</p>
            </div>
          )}
        </div>
      </header>

      {isNewChat ? (
        <div className="flex-1 flex flex-col p-4">
          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-2 px-3 py-1.5 bg-neon-blue/20 rounded-full">
                  <span className="text-sm">{u.streetName}</span>
                  <button onClick={() => setSelectedUsers(selectedUsers.filter(x => x.id !== u.id))} className="text-gray-400 hover:text-white">&times;</button>
                </div>
              ))}
              <span className="text-xs text-gray-500 self-center">Max 5 for group</span>
            </div>
          )}

          {/* Search */}
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search riders..." className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-blue mb-4" />

          {/* All Users / Search Results */}
          <div className="flex-1 overflow-y-auto">
            {allUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users size={32} className="mx-auto mb-2 opacity-50" />
                <p>Loading riders...</p>
              </div>
            ) : displayedUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No riders found</p>
              </div>
            ) : (
              displayedUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelectUser(u)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-dark-card rounded-xl transition-all"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-blue to-neon-green p-0.5">
                    <div className="w-full h-full rounded-full bg-dark-bg overflow-hidden flex items-center justify-center">
                      {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : <span className="font-bold text-neon-blue">{u.streetName?.charAt(0)}</span>}
                    </div>
                  </div>
                  <div className="text-left"><p className="font-semibold">{u.streetName}</p><p className="text-sm text-gray-500">{u.bike || 'Rider'}</p></div>
                </button>
              ))
            )}
          </div>

          {selectedUsers.length > 0 && (
            <button
              type="button"
              disabled={starting}
              onClick={() => startConversation()}
              className={`w-full py-4 rounded-xl text-center font-bold ${
                starting ? 'bg-gray-500 text-gray-300' : 'bg-gradient-to-r from-neon-blue to-neon-green text-dark-bg'
              }`}
              style={{ minHeight: '56px', WebkitTapHighlightColor: 'transparent' }}
            >
              {starting ? 'Starting...' : 'Start Chat'}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => {
              const isOwn = msg.senderId === user.uid;
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${isOwn ? 'bg-neon-blue text-dark-bg rounded-br-md' : 'bg-dark-card text-white rounded-bl-md'}`}>
                    {conversation?.isGroup && !isOwn && <p className="text-xs font-semibold mb-1 opacity-70">{msg.senderName}</p>}
                    <p className="text-sm">{msg.text}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="sticky bottom-20 p-4 bg-dark-bg border-t border-dark-border">
            <div className="flex gap-3 items-center">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Message..."
                className="flex-1 px-4 py-3 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-blue text-base"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newMessage.trim()) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (newMessage.trim()) handleSendMessage();
                }}
                onTouchEnd={() => {
                  if (newMessage.trim()) handleSendMessage();
                }}
                className={`p-3 rounded-xl touch-manipulation cursor-pointer select-none flex items-center justify-center ${
                  newMessage.trim() ? 'bg-neon-blue text-dark-bg' : 'bg-gray-600 text-gray-400'
                }`}
                style={{ minWidth: '48px', minHeight: '48px' }}
              >
                <Send size={20} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Chat;
