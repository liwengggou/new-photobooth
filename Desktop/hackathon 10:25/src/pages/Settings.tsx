import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Volume2, 
  VolumeX, 
  Camera, 
  Trash2, 
  RotateCcw, 
  Info,
  User,
  Shield,
  Bell
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { AppSettings, STORAGE_KEYS } from '../types';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    detectionSensitivity: 0.7,
    soundEnabled: true,
    cameraEnabled: true,
    notificationsEnabled: true,
    vibrationEnabled: true,
    difficulty: 'medium',
    mirrorMode: false
  });

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      setSettings(JSON.parse(saved));
    } else {
      // Default settings
      const defaultSettings: AppSettings = {
        detectionSensitivity: 0.7,
        soundEnabled: true,
        cameraEnabled: true,
        notificationsEnabled: true,
        vibrationEnabled: true,
        difficulty: 'medium',
        mirrorMode: false
      };
      setSettings(defaultSettings);
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(defaultSettings));
    }
  };

  const saveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
  };

  const toggleSetting = (key: keyof AppSettings) => {
    const newSettings = {
      ...settings,
      [key]: !settings[key]
    };
    saveSettings(newSettings);
  };

  const changeDifficulty = (difficulty: 'easy' | 'medium' | 'hard') => {
    const newSettings = {
      ...settings,
      difficulty
    };
    saveSettings(newSettings);
  };

  const resetAllData = () => {
    // Clear all stored data
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Reset settings to default
    const defaultSettings: AppSettings = {
      detectionSensitivity: 0.7,
      soundEnabled: true,
      cameraEnabled: true,
      notificationsEnabled: true,
      vibrationEnabled: true,
      difficulty: 'medium',
      mirrorMode: false
    };
    saveSettings(defaultSettings);
    
    setShowResetConfirm(false);
    
    // Show success message (you could use a toast here)
    alert('All data has been reset successfully!');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <Layout title="Settings" showBackButton>
      <div className="p-4 space-y-6">
        {/* Profile Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 rounded-2xl p-6"
        >
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Player</h3>
              <p className="text-gray-400">Face Training Warrior</p>
            </div>
          </div>
        </motion.div>

        {/* Game Settings */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 rounded-2xl p-6"
        >
          <h3 className="text-xl font-bold text-white mb-4">Game Settings</h3>
          
          <div className="space-y-4">
            {/* Sound */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {settings.soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-blue-400" />
                ) : (
                  <VolumeX className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <div className="text-white font-medium">Sound Effects</div>
                  <div className="text-sm text-gray-400">Enable game sounds</div>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleSetting('soundEnabled')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.soundEnabled ? 'bg-blue-500' : 'bg-gray-600'
                }`}
              >
                <motion.div
                  animate={{ x: settings.soundEnabled ? 24 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="w-6 h-6 bg-white rounded-full"
                />
              </motion.button>
            </div>

            {/* Camera */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Camera className={`w-5 h-5 ${settings.cameraEnabled ? 'text-green-400' : 'text-gray-400'}`} />
                <div>
                  <div className="text-white font-medium">Camera Access</div>
                  <div className="text-sm text-gray-400">Enable face detection</div>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleSetting('cameraEnabled')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.cameraEnabled ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <motion.div
                  animate={{ x: settings.cameraEnabled ? 24 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="w-6 h-6 bg-white rounded-full"
                />
              </motion.button>
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className={`w-5 h-5 ${settings.notificationsEnabled ? 'text-yellow-400' : 'text-gray-400'}`} />
                <div>
                  <div className="text-white font-medium">Notifications</div>
                  <div className="text-sm text-gray-400">Daily reminders</div>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleSetting('notificationsEnabled')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.notificationsEnabled ? 'bg-yellow-500' : 'bg-gray-600'
                }`}
              >
                <motion.div
                  animate={{ x: settings.notificationsEnabled ? 24 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="w-6 h-6 bg-white rounded-full"
                />
              </motion.button>
            </div>

            {/* Difficulty */}
            <div>
              <div className="flex items-center space-x-3 mb-3">
                <Shield className="w-5 h-5 text-purple-400" />
                <div>
                  <div className="text-white font-medium">Difficulty</div>
                  <div className="text-sm text-gray-400">Game challenge level</div>
                </div>
              </div>
              <div className="flex space-x-2">
                {(['easy', 'medium', 'hard'] as const).map((difficulty) => (
                  <motion.button
                    key={difficulty}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => changeDifficulty(difficulty)}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      settings.difficulty === difficulty
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <span className="capitalize">{difficulty}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Data Management */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800 rounded-2xl p-6"
        >
          <h3 className="text-xl font-bold text-white mb-4">Data Management</h3>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowResetConfirm(true)}
            className="w-full flex items-center justify-center space-x-3 py-3 px-4 bg-red-600 hover:bg-red-700 rounded-xl text-white font-medium transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            <span>Reset All Data</span>
          </motion.button>
          
          <p className="text-sm text-gray-400 mt-2 text-center">
            This will delete all progress, achievements, and settings
          </p>
        </motion.div>

        {/* App Info */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800 rounded-2xl p-6"
        >
          <div className="flex items-center space-x-3 mb-4">
            <Info className="w-5 h-5 text-blue-400" />
            <h3 className="text-xl font-bold text-white">About</h3>
          </div>
          
          <div className="space-y-2 text-gray-400">
            <div className="flex justify-between">
              <span>Version</span>
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Build</span>
              <span>2024.1</span>
            </div>
            <div className="flex justify-between">
              <span>Engine</span>
              <span>MediaPipe + React</span>
            </div>
          </div>
        </motion.div>

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowResetConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RotateCcw className="w-8 h-8 text-red-600" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">Reset All Data?</h3>
                <p className="text-gray-400 mb-6">
                  This action cannot be undone. All your progress, achievements, and settings will be permanently deleted.
                </p>
                
                <div className="flex space-x-3">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 rounded-xl text-white font-medium transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={resetAllData}
                    className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 rounded-xl text-white font-medium transition-colors"
                  >
                    Reset
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </Layout>
  );
};

export default Settings;