import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';

const Social: React.FC = () => {
  const navigate = useNavigate();
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [postedIndex, setPostedIndex] = useState<number | null>(null);

  const [friendActivities, setFriendActivities] = useState<string[]>([
    "You and Aiko logged in today ✅",
    "Jun reached Level 3 🎉",
    "Buddy Streak extended!"
  ]);

  const handleChallengeFriends = () => {
    setShowChallengeModal(true);
  };

  const handleCreateGame = () => {
    // Navigate to race page for creating a game
    navigate('/race');
  };

  const handleJoinGame = () => {
    // Navigate to invitation code page for joining a game
    navigate('/invitation-code');
  };

  const handlePostAchievement = () => {
    setShowAchievementModal(true);
  };

  const handlePostLatestLevel = () => {
    const text = 'Riko reached level 4!';
    setFriendActivities(prev => {
      const next = [...prev, text];
      setPostedIndex(next.length - 1);
      return next;
    });
    setShowAchievementModal(false);
  };

  const handleDeletePost = () => {
    if (postedIndex === null) return;
    setFriendActivities(prev => prev.filter((_, i) => i !== postedIndex));
    setPostedIndex(null);
    setShowDeleteModal(false);
  };

  return (
    <Layout showNavigation={true} showTopNavigation={false}>
      {/* Scrollable content inside iPhone frame */}
      <div className="h-full overflow-y-auto px-6 pt-4 pb-20">
        {/* Top Section - Buddy Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20"
        >
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center">
              <span className="text-xl font-bold text-white">Buddy Streak: 🔥 3 days</span>
            </div>
            
            <div className="flex items-center justify-center">
              <span className="text-xl font-bold text-white">Buddy Level: 2</span>
            </div>
            
            <p className="text-sm text-white/80 font-medium">
              Keep going together!
            </p>
          </div>
        </motion.div>

        {/* Middle Section - Challenge Friends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6"
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleChallengeFriends}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <div className="flex items-center justify-center space-x-3">
              <div className="text-3xl">⚔️</div>
              <span className="text-white font-bold text-lg">Challenge Friends</span>
            </div>
          </motion.button>
        </motion.div>

        {/* Bottom Section - Friend Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6"
        >
          <div className="mb-4">
            <h3 className="text-white font-semibold text-lg">Friend Activity</h3>
          </div>

          <div className="space-y-3">
            {friendActivities.map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                className={`bg-white/5 rounded-lg p-3 border border-white/10 ${index === postedIndex ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (index === postedIndex) setShowDeleteModal(true);
                }}
              >
                <p className="text-white/90 text-sm">{activity}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Post Achievement Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mb-6"
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handlePostAchievement}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <div className="flex items-center justify-center space-x-3">
              <div className="text-3xl">🏆</div>
              <span className="text-white font-bold text-lg">Post your achievement</span>
            </div>
          </motion.button>
        </motion.div>
      </div>

      {showAchievementModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowAchievementModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white/20 backdrop-blur-md rounded-2xl p-6 w-full max-w-sm border border-white/30"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-xl mb-4 text-center">
              Post your achievement
            </h3>
            <div className="space-y-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="w-full bg-white/10 rounded-xl p-3 text-white font-medium border border-white/10"
              >
                Post your daily streak
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handlePostLatestLevel}
                className="w-full bg-white/10 rounded-xl p-3 text-white font-medium border border-white/10"
              >
                Post the latest level you achieved
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="w-full bg-white/10 rounded-xl p-3 text-white font-medium border border-white/10"
              >
                Post your total days played
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="w-full bg-white/10 rounded-xl p-3 text-white font-medium border border-white/10"
              >
                Post your badge
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="w-full bg-white/10 rounded-xl p-3 text-white font-medium border border-white/10"
              >
                Post your buddy daily streak
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="w-full bg-white/10 rounded-xl p-3 text-white font-medium border border-white/10"
              >
                Post the latest buddy level you and your buddy achieved
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAchievementModal(false)}
                className="w-full bg-white/10 rounded-xl p-3 text-white/80 font-medium border border-white/10"
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Challenge Friends Modal */}
      {showChallengeModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowChallengeModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white/20 backdrop-blur-md rounded-2xl p-6 w-full max-w-sm border border-white/30"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-xl mb-4 text-center">
              Challenge Friends
            </h3>
            
            <div className="space-y-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleCreateGame}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-4 text-white font-semibold border border-white/20"
              >
                Create Game
              </motion.button>
              
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleJoinGame}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-4 text-white font-semibold border border-white/20"
              >
                Join Game
              </motion.button>
              
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowChallengeModal(false)}
                className="w-full bg-white/10 rounded-xl p-3 text-white/80 font-medium border border-white/10"
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {showDeleteModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white/20 backdrop-blur-md rounded-2xl p-6 w-full max-w-sm border border-white/30"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-xl mb-4 text-center">Delete post?</h3>
            <div className="space-y-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleDeletePost}
                className="w-full bg-gradient-to-r from-red-600 to-rose-600 rounded-xl p-3 text-white font-semibold border border-white/20"
              >
                Delete
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDeleteModal(false)}
                className="w-full bg-white/10 rounded-xl p-3 text-white/80 font-medium border border-white/10"
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </Layout>
  );
};

export default Social;
