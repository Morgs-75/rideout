import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Bug, Lightbulb, HelpCircle, AlertTriangle, Send, Check, Camera } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

const problemTypes = [
  { id: 'bug', label: 'Bug Report', description: 'Something isn\'t working correctly', icon: Bug },
  { id: 'feature', label: 'Feature Request', description: 'Suggest a new feature or improvement', icon: Lightbulb },
  { id: 'question', label: 'Question', description: 'Need help with something', icon: HelpCircle },
  { id: 'other', label: 'Other', description: 'Something else', icon: AlertTriangle }
];

const ReportProblem = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const [selectedType, setSelectedType] = useState(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState(userProfile?.email || '');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedType) {
      setError('Please select a problem type');
      return;
    }
    if (!subject.trim()) {
      setError('Please enter a subject');
      return;
    }
    if (!description.trim()) {
      setError('Please describe the problem');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await addDoc(collection(db, 'problemReports'), {
        userId: user?.uid || 'anonymous',
        userStreetName: userProfile?.streetName || 'Anonymous',
        email: email.trim(),
        type: selectedType,
        subject: subject.trim(),
        description: description.trim(),
        status: 'new',
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height
        },
        appVersion: '1.0.0',
        createdAt: serverTimestamp()
      });

      setSubmitted(true);
    } catch (err) {
      setError('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-dark-bg">
        <header className="sticky top-0 z-40 bg-dark-bg/95 backdrop-blur-lg border-b border-dark-border safe-top">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-white">
              <ArrowLeft size={24} />
            </button>
            <h1 className="font-semibold">Report a Problem</h1>
          </div>
        </header>

        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 bg-neon-green/20 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Check size={40} className="text-neon-green" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-3">Thanks for your feedback!</h2>
          <p className="text-gray-500 mb-8">
            We've received your report and will look into it. If you provided an email, we'll follow up with you.
          </p>
          <button
            onClick={() => navigate('/settings')}
            className="px-8 py-3 bg-neon-blue text-dark-bg font-semibold rounded-xl hover:bg-neon-blue/80 transition-all"
          >
            Back to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="sticky top-0 z-40 bg-dark-bg/95 backdrop-blur-lg border-b border-dark-border safe-top">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-white">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-semibold">Report a Problem</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-6">
        {/* Problem Type */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-3">
            What type of issue is this?
          </label>
          <div className="grid grid-cols-2 gap-3">
            {problemTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedType(type.id)}
                className={`p-4 rounded-xl border transition-all text-left ${
                  selectedType === type.id
                    ? 'border-neon-blue bg-neon-blue/10'
                    : 'border-dark-border hover:border-gray-600'
                }`}
              >
                <type.icon
                  size={24}
                  className={selectedType === type.id ? 'text-neon-blue mb-2' : 'text-gray-500 mb-2'}
                />
                <p className="font-medium text-sm">{type.label}</p>
                <p className="text-xs text-gray-500 mt-1">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary of the issue"
            maxLength={100}
            className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-blue focus:outline-none transition-all"
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please describe the issue in detail. Include steps to reproduce if it's a bug."
            rows={5}
            maxLength={2000}
            className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-blue focus:outline-none transition-all resize-none"
          />
          <p className="text-xs text-gray-600 mt-1 text-right">{description.length}/2000</p>
        </div>

        {/* Email */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Email (optional)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-blue focus:outline-none transition-all"
          />
          <p className="text-xs text-gray-600 mt-1">We'll use this to follow up if needed</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-neon-blue text-dark-bg font-semibold rounded-xl hover:bg-neon-blue/80 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-dark-bg border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Send size={20} />
              Submit Report
            </>
          )}
        </button>

        {/* Info */}
        <p className="text-xs text-gray-600 text-center mt-6">
          Your device information will be included to help us diagnose the issue.
        </p>
      </form>
    </div>
  );
};

export default ReportProblem;
