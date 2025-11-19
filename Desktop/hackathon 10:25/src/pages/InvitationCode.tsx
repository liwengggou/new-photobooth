import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ArrowLeft } from 'lucide-react';

const InvitationCode: React.FC = () => {
  const navigate = useNavigate();
  const [invitationCode, setInvitationCode] = useState('');

  const handleJoinRace = () => {
    // For testing - any code will work and navigate to social race
    if (invitationCode.trim()) {
      navigate('/social-race');
    }
  };

  const handleBack = () => {
    navigate('/social');
  };

  return (
    <Layout showNavigation={false}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center px-6 pt-6 pb-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleBack}
            className="mr-4 p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </motion.button>
          <h1 className="text-2xl font-bold text-white">Enter Invitation Code</h1>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Input Field */}
            <div className="space-y-2">
              <label className="text-white/90 font-medium text-lg">
                Invitation Code
              </label>
              <input
                type="text"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value)}
                placeholder="Enter your friend's code"
                className="w-full px-4 py-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/50 text-lg focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleJoinRace();
                  }
                }}
              />
            </div>

            {/* Join Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleJoinRace}
              disabled={!invitationCode.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-4 text-white font-bold text-lg border border-white/20 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Race
            </motion.button>

            {/* Helper Text */}
            <p className="text-white/70 text-center text-sm">
              Don't have a code? Ask a friend to create one.
            </p>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default InvitationCode;