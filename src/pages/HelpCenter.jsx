import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronDown, Search, Zap, Users, Shield, MessageCircle, Map, Award, Settings, HelpCircle } from 'lucide-react';

const faqs = [
  {
    category: 'Getting Started',
    icon: Zap,
    questions: [
      {
        q: 'What is RideOut?',
        a: 'RideOut is a social platform designed specifically for electric motorbike and ebike riders. Share your rides, connect with other riders, discover group rides, and earn points for being an active member of the community.'
      },
      {
        q: 'How do I create my first post?',
        a: 'Tap the + button in the bottom navigation bar. You can share photos, videos (up to 30 seconds), or text-only posts with custom backgrounds. Add a caption, location, and hashtags to help others discover your content.'
      },
      {
        q: 'What is a Street Name?',
        a: 'Your Street Name is your unique rider identity on RideOut. Choose something that represents you as a rider. This is how other riders will know you in the community.'
      }
    ]
  },
  {
    category: 'Points & Rewards',
    icon: Award,
    questions: [
      {
        q: 'How do I earn points?',
        a: 'You earn points by being active: posting content (20 pts), receiving likes (2 pts) and upvotes (5 pts), commenting (2 pts), joining group rides (20 pts), and referring friends (up to 100 pts). There are daily limits to prevent spam.'
      },
      {
        q: 'What are the rider tiers?',
        a: 'There are 4 tiers: Rider (0-499 pts), Core Rider (500-1,499 pts), Crew Leader (1,500-4,999 pts), and Road Captain (5,000+ pts). Higher tiers unlock special badges and features.'
      },
      {
        q: 'What can I unlock with points?',
        a: 'You can unlock custom badge colors, featured post placement, and exclusive founding rider status. Check the Leaderboard page for available unlockables.'
      }
    ]
  },
  {
    category: 'Community Features',
    icon: Users,
    questions: [
      {
        q: 'How do I find other riders?',
        a: 'Use the Explore tab to discover riders and posts. You can also use the Rider Map to see where other riders are posting from in real-time.'
      },
      {
        q: 'How do I join a group ride?',
        a: 'Go to the Rides section (tap the map icon). Browse announced rides, see the meeting point, time, and who\'s joining. Tap "Join Ride" to participate.'
      },
      {
        q: 'How do I create a group ride?',
        a: 'In the Rides section, tap "Create Ride". Set a title, meeting location, date/time, and description. Other riders will be able to see and join your ride.'
      }
    ]
  },
  {
    category: 'Rider Map',
    icon: Map,
    questions: [
      {
        q: 'How does the Rider Map work?',
        a: 'The Rider Map shows locations where riders have posted from. Enable location sharing to appear on the map. You can see recent activity and discover riders in your area.'
      },
      {
        q: 'How do I hide my location?',
        a: 'Go to Settings > Privacy Settings and toggle off "Show on Rider Map". You can also disable location sharing entirely in Settings > Location Sharing.'
      }
    ]
  },
  {
    category: 'Privacy & Safety',
    icon: Shield,
    questions: [
      {
        q: 'How do I block someone?',
        a: 'Visit their profile, tap the menu icon (three dots) in the top right, and select "Block User". Blocked users cannot see your posts or message you.'
      },
      {
        q: 'How do I report inappropriate content?',
        a: 'Tap the menu icon on any post or profile and select "Report". Choose a reason and provide details. Our team reviews all reports.'
      },
      {
        q: 'Who can see my posts?',
        a: 'By default, everyone can see your posts. You can change this in Settings > Privacy Settings to limit visibility to followers only or make your profile private.'
      }
    ]
  },
  {
    category: 'Messaging',
    icon: MessageCircle,
    questions: [
      {
        q: 'How do I send a message?',
        a: 'Visit a rider\'s profile and tap the message icon, or go to Messages and start a new conversation. You can also create group chats with up to 5 riders.'
      },
      {
        q: 'Can I disable messages?',
        a: 'Yes, go to Settings > Privacy Settings and set "Who Can Message You" to "Followers Only" or "No One".'
      }
    ]
  },
  {
    category: 'Account Settings',
    icon: Settings,
    questions: [
      {
        q: 'How do I edit my profile?',
        a: 'Go to your profile and tap "Edit Profile", or go to Settings > Edit Profile. You can change your avatar, bio, and bike information.'
      },
      {
        q: 'How do I change my password?',
        a: 'Currently, password changes are done through the login screen using the "Forgot Password" option. We\'ll send a reset link to your email.'
      },
      {
        q: 'How do I delete my account?',
        a: 'Contact us through the "Report a Problem" option in Settings. Account deletion requests are processed within 7 days.'
      }
    ]
  }
];

const HelpCenter = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  const filteredFaqs = searchQuery.trim()
    ? faqs.map(category => ({
        ...category,
        questions: category.questions.filter(
          q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
               q.a.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(category => category.questions.length > 0)
    : faqs;

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="sticky top-0 z-40 bg-dark-bg/95 backdrop-blur-lg border-b border-dark-border safe-top">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-white">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-semibold">Help Center</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Search */}
        <div className="relative mb-6">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for help..."
            className="w-full pl-12 pr-4 py-3 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-blue focus:outline-none transition-all"
          />
        </div>

        {/* FAQ Categories */}
        <div className="space-y-4">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-500">No results found for "{searchQuery}"</p>
              <p className="text-sm text-gray-600 mt-2">Try different keywords or browse categories below</p>
            </div>
          ) : (
            filteredFaqs.map((category, categoryIndex) => (
              <div
                key={category.category}
                className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedCategory(
                    expandedCategory === categoryIndex ? null : categoryIndex
                  )}
                  className="w-full p-4 flex items-center justify-between hover:bg-dark-surface transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neon-blue/20 flex items-center justify-center">
                      <category.icon size={20} className="text-neon-blue" />
                    </div>
                    <span className="font-semibold">{category.category}</span>
                  </div>
                  <motion.div
                    animate={{ rotate: expandedCategory === categoryIndex ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={20} className="text-gray-500" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {expandedCategory === categoryIndex && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-dark-border">
                        {category.questions.map((item, questionIndex) => {
                          const questionKey = `${categoryIndex}-${questionIndex}`;
                          return (
                            <div key={questionIndex} className="border-b border-dark-border last:border-b-0">
                              <button
                                onClick={() => setExpandedQuestion(
                                  expandedQuestion === questionKey ? null : questionKey
                                )}
                                className="w-full p-4 flex items-start justify-between text-left hover:bg-dark-surface/50 transition-all"
                              >
                                <span className="font-medium text-sm pr-4">{item.q}</span>
                                <motion.div
                                  animate={{ rotate: expandedQuestion === questionKey ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="flex-shrink-0 mt-0.5"
                                >
                                  <ChevronDown size={16} className="text-gray-500" />
                                </motion.div>
                              </button>

                              <AnimatePresence>
                                {expandedQuestion === questionKey && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <p className="px-4 pb-4 text-sm text-gray-400 leading-relaxed">
                                      {item.a}
                                    </p>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>

        {/* Contact Section */}
        <div className="mt-8 p-6 bg-dark-card border border-dark-border rounded-2xl text-center">
          <h3 className="font-semibold mb-2">Still need help?</h3>
          <p className="text-sm text-gray-500 mb-4">
            Can't find what you're looking for? Report a problem and we'll get back to you.
          </p>
          <button
            onClick={() => navigate('/report-problem')}
            className="px-6 py-3 bg-neon-blue text-dark-bg font-semibold rounded-xl hover:bg-neon-blue/80 transition-all"
          >
            Report a Problem
          </button>
        </div>

        <p className="text-center text-xs text-gray-600 mt-8">
          RideOut v1.0.0 • Ride together. Share the volt.
        </p>
      </div>
    </div>
  );
};

export default HelpCenter;
