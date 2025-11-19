import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const courses = [
    { name: 'Jawline Sprint', emoji: '💎🏃', time: '3–5 min' },
    { name: 'Cheek Lift Run', emoji: '😊🏃', time: '3–5 min' },
    { name: 'Slim Face Dash', emoji: '🧖‍♀️⚡', time: '3–5 min' },
    { name: 'Smile Line Racer', emoji: '🙂🏁', time: '3–5 min' },
    { name: 'V-Line Track', emoji: '🔻🏃', time: '3–5 min' },
    { name: 'Full Face Circuit', emoji: '🙂🔄', time: '3–5 min' },
  ];

  return (
    <Layout>
      {/* Scrollable content inside iPhone frame */}
      <div className="h-full overflow-y-auto">
        {/* 1) Level & Unlock Progress (no title) */}
        <div className="px-6 pt-8">
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-3xl font-bold text-white">Level 4</h2>
            </div>
            {/* XP meter style progress bar */}
            <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden ring-1 ring-white/30">
              <div
                className="h-full w-[60%] bg-gradient-to-r from-yellow-300 via-orange-500 to-pink-600 shadow-lg"
                style={{ boxShadow: '0 0 12px rgba(255, 180, 80, 0.6)' }}
              />
            </div>
            <p className="mt-2 text-white/90 text-sm">450 points left to unlock a new theme!</p>
          </motion.div>
        </div>

        {/* 2) Streak Section (moved above courses) */}
        <div className="px-6 mt-6">
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center"
          >
            <div className="text-white text-lg font-semibold">🔥 Streak</div>
            <div className="text-white/90 text-2xl font-bold mt-1">5 days</div>
            <div className="text-white/80 text-sm mt-1">Keep going!</div>
          </motion.div>
        </div>

        {/* 3) Choose Your Course */}
        <div className="px-6 mt-6">
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-5"
          >
            <h3 className="text-white text-lg font-semibold mb-4">Choose Your Course</h3>
            <div className="grid grid-cols-2 gap-3">
              {courses.map((course) => (
                <motion.button
                  key={course.name}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => navigate('/race')}
                  className="bg-white/10 border border-white/20 rounded-xl p-4 text-left hover:bg-white/15 transition-colors"
                >
                  <div className="text-2xl mb-1">{course.emoji}</div>
                  <div className="text-white text-sm font-semibold leading-snug">{course.name}</div>
                  <div className="text-white/80 text-xs">Estimated time: {course.time}</div>
                </motion.button>
              ))}
            </div>
            
            {/* Custom Course Button */}
            <motion.button
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/custom-survey')}
              className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Customize Your Own Course ✨
            </motion.button>
          </motion.div>
        </div>

        {/* Bottom spacing */}
        <div className="pb-28" />
      </div>
    </Layout>
  );
};

export default Home;