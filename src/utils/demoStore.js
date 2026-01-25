// Demo store using localStorage for testing without Firebase

const POSTS_KEY = 'rideout_demo_posts_v2';

// Street names for demo users
const STREET_NAMES = [
  'ThunderVolt', 'SilentStorm', 'VoltRider', 'NightWatt', 'ElectroGhost',
  'ZeroEmissions', 'WattWarrior', 'SparkRider', 'CurrentKing', 'JoltJockey',
  'PowerSlide', 'ChargeBoss', 'BatteryBeast', 'TorqueKing', 'SurgeRider',
  'FlashVolt', 'StaticShock', 'AmpedUp', 'MegaWatt', 'VoltageKid'
];

const CAPTIONS = [
  "Night cruise through the city lights #nightride #urban #electriclife",
  "Full send on the trails today! #offroad #surron #sendit",
  "New personal best - 45 miles on one charge #range #efficiency",
  "Squad ride was insane today #crew #rideout #weekend",
  "Testing the new 72v upgrade #power #custombuild #beast",
  "Silent but deadly #stealth #nightmoves #electric",
  "Golden hour vibes #sunset #photography #ebike",
  "Trail destruction mode activated #mud #dirt #adventure",
  "City streets at 2am hits different #latenight #urban #solo",
  "Finally got the suspension dialed in #setup #tuning #perfect",
  "Group ride through downtown #squad #citylife #electric",
  "This climb was no joke #hills #torque #power",
  "Beach cruise with the homies #coastal #summer #vibes",
  "Warehouse district exploration #urban #adventure #exploring",
  "First ride of the season #spring #fresh #excited",
  "Mountain trails > everything else #mtb #nature #freedom",
  "Late night parking garage session #concrete #urban #fun",
  "New tire day! #upgrade #grip #tires",
  "Pushing limits on the track #speed #racing #adrenaline",
  "Misty morning ride #fog #moody #atmospheric",
  "Industrial zone adventures #urbex #exploring #abandoned",
  "Full moon night ride #lunar #night #magical",
  "Bridge crossing with the crew #architecture #city #views",
  "Forest trail therapy #nature #peaceful #escape",
  "Rooftop parking vibes #sunset #city #photography",
  "Rain doesn't stop us #wet #allweather #dedicated",
  "Dawn patrol before work #early #sunrise #motivated",
  "Skatepark takeover #tricks #fun #skills",
  "Canyon carving all day #twisties #curves #flow",
  "End of an epic day #tired #happy #grateful"
];

const COMMENTS_POOL = [
  { user: 'SpeedDemon', text: 'Absolutely insane shot! 🔥' },
  { user: 'VoltageQueen', text: 'Where is this?? Need to ride there' },
  { user: 'SilentRider', text: 'That setup is clean af' },
  { user: 'WattMaster', text: 'Goals right here 💯' },
  { user: 'TorqueTitan', text: 'Send me the specs on that build!' },
  { user: 'ElectricDreams', text: 'This is why I love this community' },
  { user: 'BatteryLife', text: 'How many miles you getting on that?' },
  { user: 'ChargingUp', text: 'Next level content 🙌' },
  { user: 'ZeroNoise', text: 'The stealth mode is real' },
  { user: 'CurrentFlow', text: 'Wish I was there!' },
  { user: 'PowerUp', text: 'That trail looks sick' },
  { user: 'JoltMaster', text: 'What controller you running?' },
  { user: 'AmpHours', text: 'Clean build bro 👊' },
  { user: 'VoltLife', text: 'This is the way' },
  { user: 'SurgeProtector', text: 'Legendary spot' },
  { user: 'OhmMyGod', text: 'The lighting in this shot 😍' },
  { user: 'WattAge', text: 'Need that in my life' },
  { user: 'StaticFree', text: 'Pure vibes' },
  { user: 'ChargeMode', text: 'How fast does it go?' },
  { user: 'ElectroMag', text: 'This community is everything 🤙' }
];

// Electric bike/motorcycle action shots from Unsplash
const IMAGES = [
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
  'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800',
  'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=800',
  'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800',
  'https://images.unsplash.com/photo-1558980664-769d59546b3d?w=800',
  'https://images.unsplash.com/photo-1603039986595-8d53e7c7b063?w=800',
  'https://images.unsplash.com/photo-1593764592116-bfb2a97c642a?w=800',
  'https://images.unsplash.com/photo-1558981285-6f0c94958bb6?w=800',
  'https://images.unsplash.com/photo-1558981033-0f0309284409?w=800',
  'https://images.unsplash.com/photo-1558980664-1db506751c6c?w=800',
  'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800',
  'https://images.unsplash.com/photo-1558981359-219d6364c9c8?w=800',
  'https://images.unsplash.com/photo-1558980663-6c7e1e09e8a4?w=800',
  'https://images.unsplash.com/photo-1558981420-87aa9dad1c89?w=800',
  'https://images.unsplash.com/photo-1558980394-4c7c9299fe96?w=800',
  'https://images.unsplash.com/photo-1596738773498-aa49cb7d936b?w=800',
  'https://images.unsplash.com/photo-1619771914272-e3c1d5e48cf8?w=800',
  'https://images.unsplash.com/photo-1611241893603-3c359704e0ee?w=800',
  'https://images.unsplash.com/photo-1580310614729-ccd69652491d?w=800',
  'https://images.unsplash.com/photo-1558980664-28d10ee9bb52?w=800',
  'https://images.unsplash.com/photo-1558981082-371b5f42f702?w=800',
  'https://images.unsplash.com/photo-1558981852-426c6c22a060?w=800',
  'https://images.unsplash.com/photo-1558981001-5864b3250a69?w=800',
  'https://images.unsplash.com/photo-1558980664-3a031cf67237?w=800',
  'https://images.unsplash.com/photo-1558981408-b906a193fb0a?w=800',
  'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800',
  'https://images.unsplash.com/photo-1558981359-219d6364c9c8?w=800',
  'https://images.unsplash.com/photo-1558980664-10e7170b5df9?w=800',
  'https://images.unsplash.com/photo-1558981000-f294a6ed32b2?w=800',
  'https://images.unsplash.com/photo-1558981001-1995eb47bc64?w=800'
];

// Generate random comments for a post
const generateComments = (count) => {
  const comments = [];
  const shuffled = [...COMMENTS_POOL].sort(() => Math.random() - 0.5);
  for (let i = 0; i < count; i++) {
    const comment = shuffled[i % shuffled.length];
    comments.push({
      id: `comment-${Date.now()}-${i}`,
      ...comment,
      createdAt: new Date(Date.now() - Math.random() * 86400000).toISOString()
    });
  }
  return comments;
};

// Generate 30 sample posts
const generateSamplePosts = () => {
  const posts = [];

  for (let i = 0; i < 30; i++) {
    const hoursAgo = i * 2 + Math.random() * 3; // Spread posts over time
    const likes = Math.floor(Math.random() * 200) + 10;
    const upvotes = Math.floor(Math.random() * 150) + 5;
    const downvotes = Math.floor(Math.random() * 10);
    const commentCount = Math.floor(Math.random() * 25) + 1;

    posts.push({
      id: `demo-post-${i + 1}`,
      userId: `demo-user-${(i % 20) + 1}`,
      streetName: STREET_NAMES[i % STREET_NAMES.length],
      userAvatar: '',
      mediaType: 'photo',
      mediaUrl: IMAGES[i % IMAGES.length],
      caption: CAPTIONS[i % CAPTIONS.length],
      hashtags: CAPTIONS[i % CAPTIONS.length].match(/#\w+/g)?.map(t => t.slice(1)) || [],
      likes,
      likedBy: [],
      upvotes,
      downvotes,
      upvotedBy: [],
      downvotedBy: [],
      commentCount,
      comments: generateComments(commentCount),
      createdAt: new Date(Date.now() - hoursAgo * 3600000).toISOString()
    });
  }

  return posts;
};

const SAMPLE_POSTS = generateSamplePosts();

export const demoPosts = {
  getAll: () => {
    const stored = localStorage.getItem(POSTS_KEY);
    if (!stored) {
      localStorage.setItem(POSTS_KEY, JSON.stringify(SAMPLE_POSTS));
      return SAMPLE_POSTS;
    }
    return JSON.parse(stored);
  },

  reset: () => {
    localStorage.setItem(POSTS_KEY, JSON.stringify(SAMPLE_POSTS));
    return SAMPLE_POSTS;
  },

  add: (post) => {
    const posts = demoPosts.getAll();
    const newPost = {
      ...post,
      id: 'demo-post-' + Date.now(),
      comments: [],
      createdAt: new Date().toISOString()
    };
    posts.unshift(newPost);
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
    return newPost;
  },

  get: (id) => {
    const posts = demoPosts.getAll();
    return posts.find(p => p.id === id);
  },

  update: (id, updates) => {
    const posts = demoPosts.getAll();
    const index = posts.findIndex(p => p.id === id);
    if (index !== -1) {
      posts[index] = { ...posts[index], ...updates };
      localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
    }
    return posts[index];
  },

  delete: (id) => {
    const posts = demoPosts.getAll();
    const filtered = posts.filter(p => p.id !== id);
    localStorage.setItem(POSTS_KEY, JSON.stringify(filtered));
  },

  addComment: (postId, comment) => {
    const posts = demoPosts.getAll();
    const post = posts.find(p => p.id === postId);
    if (post) {
      if (!post.comments) post.comments = [];
      post.comments.unshift({
        id: `comment-${Date.now()}`,
        ...comment,
        createdAt: new Date().toISOString()
      });
      post.commentCount = post.comments.length;
      localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
    }
    return post;
  },

  toggleLike: (postId, userId) => {
    const posts = demoPosts.getAll();
    const post = posts.find(p => p.id === postId);
    if (post) {
      const liked = post.likedBy.includes(userId);
      if (liked) {
        post.likedBy = post.likedBy.filter(id => id !== userId);
        post.likes--;
      } else {
        post.likedBy.push(userId);
        post.likes++;
      }
      localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
    }
    return post;
  },

  vote: (postId, userId, direction) => {
    const posts = demoPosts.getAll();
    const post = posts.find(p => p.id === postId);
    if (post) {
      const upvoted = post.upvotedBy.includes(userId);
      const downvoted = post.downvotedBy.includes(userId);

      if (upvoted) {
        post.upvotedBy = post.upvotedBy.filter(id => id !== userId);
        post.upvotes--;
      }
      if (downvoted) {
        post.downvotedBy = post.downvotedBy.filter(id => id !== userId);
        post.downvotes--;
      }

      if (direction === 'up' && !upvoted) {
        post.upvotedBy.push(userId);
        post.upvotes++;
      } else if (direction === 'down' && !downvoted) {
        post.downvotedBy.push(userId);
        post.downvotes++;
      }

      localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
    }
    return post;
  }
};

// Demo messages store
const MESSAGES_KEY = 'rideout_demo_messages';

const DEMO_CONVERSATIONS = [
  {
    id: 'conv-1',
    participants: ['demo-user-123', 'demo-user-2'],
    participantNames: { 'demo-user-123': 'VoltRider', 'demo-user-2': 'ThunderVolt' },
    lastMessage: 'You coming to the group ride Saturday?',
    lastMessageTime: new Date(Date.now() - 1800000).toISOString(),
    unread: 2,
    messages: [
      { id: 'm1', senderId: 'demo-user-2', text: 'Yo that trail was insane yesterday!', createdAt: new Date(Date.now() - 7200000).toISOString() },
      { id: 'm2', senderId: 'demo-user-123', text: 'Fr fr, we gotta go back', createdAt: new Date(Date.now() - 5400000).toISOString() },
      { id: 'm3', senderId: 'demo-user-2', text: 'You coming to the group ride Saturday?', createdAt: new Date(Date.now() - 1800000).toISOString() }
    ]
  },
  {
    id: 'conv-2',
    participants: ['demo-user-123', 'demo-user-3'],
    participantNames: { 'demo-user-123': 'VoltRider', 'demo-user-3': 'ZeroEmissions' },
    lastMessage: 'Just ordered the 72v controller 🔥',
    lastMessageTime: new Date(Date.now() - 3600000).toISOString(),
    unread: 0,
    messages: [
      { id: 'm1', senderId: 'demo-user-123', text: 'What controller you running?', createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 'm2', senderId: 'demo-user-3', text: 'ASI BAC4000, absolute beast', createdAt: new Date(Date.now() - 82800000).toISOString() },
      { id: 'm3', senderId: 'demo-user-123', text: 'Just ordered the 72v controller 🔥', createdAt: new Date(Date.now() - 3600000).toISOString() }
    ]
  },
  {
    id: 'conv-3',
    participants: ['demo-user-123', 'demo-user-4', 'demo-user-5', 'demo-user-6'],
    participantNames: { 'demo-user-123': 'VoltRider', 'demo-user-4': 'SilentRider', 'demo-user-5': 'NightWatt', 'demo-user-6': 'ElectroGhost' },
    isGroup: true,
    groupName: 'Night Riders Crew',
    lastMessage: 'Meet at the usual spot 9pm',
    lastMessageTime: new Date(Date.now() - 900000).toISOString(),
    unread: 5,
    messages: [
      { id: 'm1', senderId: 'demo-user-4', text: 'Night ride tonight?', createdAt: new Date(Date.now() - 7200000).toISOString() },
      { id: 'm2', senderId: 'demo-user-5', text: 'Im down', createdAt: new Date(Date.now() - 6000000).toISOString() },
      { id: 'm3', senderId: 'demo-user-6', text: 'Same, just finished charging', createdAt: new Date(Date.now() - 4800000).toISOString() },
      { id: 'm4', senderId: 'demo-user-123', text: 'Lets goooo', createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 'm5', senderId: 'demo-user-4', text: 'Meet at the usual spot 9pm', createdAt: new Date(Date.now() - 900000).toISOString() }
    ]
  }
];

export const demoMessages = {
  getConversations: (userId) => {
    const stored = localStorage.getItem(MESSAGES_KEY);
    if (!stored) {
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(DEMO_CONVERSATIONS));
      return DEMO_CONVERSATIONS;
    }
    return JSON.parse(stored);
  },

  getConversation: (convId) => {
    const convs = demoMessages.getConversations();
    return convs.find(c => c.id === convId);
  },

  sendMessage: (convId, message) => {
    const convs = demoMessages.getConversations();
    const conv = convs.find(c => c.id === convId);
    if (conv) {
      const newMsg = {
        id: `m-${Date.now()}`,
        ...message,
        createdAt: new Date().toISOString()
      };
      conv.messages.push(newMsg);
      conv.lastMessage = message.text;
      conv.lastMessageTime = newMsg.createdAt;
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(convs));
      return newMsg;
    }
    return null;
  }
};
