import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Layout } from './Layout';
import { Check } from 'lucide-react';

interface SurveyResponses {
  focusArea: string;
  intensity: string;
}

const CustomCourseSurvey: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [responses, setResponses] = useState<SurveyResponses>({
    focusArea: '',
    intensity: ''
  });

  const focusAreas = [
    { id: 'jawline', label: 'Jawline', emoji: '💎' },
    { id: 'cheeks', label: 'Cheeks', emoji: '😊' },
    { id: 'slim-face', label: 'Slim Face', emoji: '🧖‍♀️' },
    { id: 'smile-lines', label: 'Smile Lines', emoji: '🙂' },
    { id: 'full-face', label: 'Full Face', emoji: '🌟' }
  ];

  const intensities = [
    { id: 'light', label: 'Light', description: 'Gentle exercises', color: 'bg-green-500' },
    { id: 'medium', label: 'Medium', description: 'Balanced workout', color: 'bg-yellow-500' },
    { id: 'hard', label: 'Hard', description: 'Intensive training', color: 'bg-red-500' }
  ];

  const handleFocusAreaSelect = (area: string) => {
    setResponses(prev => ({ ...prev, focusArea: area }));
    setCurrentStep(2);
  };

  const handleIntensitySelect = (intensity: string) => {
    setResponses(prev => ({ ...prev, intensity }));
  };

  const handleSubmit = () => {
    // Navigate to race page with custom course parameters
    navigate('/race', { 
      state: { 
        customCourse: true,
        focusArea: responses.focusArea,
        intensity: responses.intensity
      } 
    });
  };

  const canSubmit = responses.focusArea && responses.intensity;

  return (
    <Layout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-6 pt-8 pb-4">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center"
          >
            <h2 className="text-2xl font-bold text-white mb-2">Create Your Custom Course</h2>
            <p className="text-white/80 text-sm">Answer two quick questions to personalize your workout</p>
          </motion.div>
        </div>

        {/* Progress indicator */}
        <div className="px-6 mb-6">
          <div className="flex items-center justify-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${currentStep >= 1 ? 'bg-white' : 'bg-white/30'}`} />
            <div className={`w-3 h-3 rounded-full ${currentStep >= 2 ? 'bg-white' : 'bg-white/30'}`} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-6">
          {currentStep === 1 && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="space-y-4"
            >
              <h3 className="text-white text-lg font-semibold mb-4">
                Which area do you want to focus on today?
              </h3>
              <div className="space-y-3">
                {focusAreas.map((area) => (
                  <motion.button
                    key={area.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleFocusAreaSelect(area.id)}
                    className="w-full bg-white/10 backdrop-blur-sm rounded-xl p-4 text-left hover:bg-white/15 transition-colors border border-white/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{area.emoji}</span>
                        <span className="text-white font-medium">{area.label}</span>
                      </div>
                      {responses.focusArea === area.id && (
                        <Check className="w-5 h-5 text-green-400" />
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="space-y-4"
            >
              <h3 className="text-white text-lg font-semibold mb-4">
                How intense do you want it?
              </h3>
              <div className="space-y-3">
                {intensities.map((intensity) => (
                  <motion.button
                    key={intensity.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleIntensitySelect(intensity.id)}
                    className={`w-full backdrop-blur-sm rounded-xl p-4 text-left hover:bg-white/15 transition-colors border ${
                      responses.intensity === intensity.id
                        ? 'bg-white/20 border-white/40'
                        : 'bg-white/10 border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{intensity.label}</span>
                      {responses.intensity === intensity.id && (
                        <Check className="w-5 h-5 text-green-400" />
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${intensity.color}`} />
                      <span className="text-white/80 text-sm">{intensity.description}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-6 pb-8 pt-4 space-y-3">
          {currentStep === 2 && (
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`w-full py-4 rounded-xl font-semibold transition-colors ${
                canSubmit
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700'
                  : 'bg-white/20 text-white/50 cursor-not-allowed'
              }`}
            >
              Start Custom Course ✨
            </motion.button>
          )}
          
          {currentStep === 2 && (
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentStep(1)}
              className="w-full py-3 text-white/70 hover:text-white transition-colors"
            >
              Back
            </motion.button>
          )}

          {currentStep === 1 && (
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/')}
              className="w-full py-3 text-white/70 hover:text-white transition-colors"
            >
              Cancel
            </motion.button>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CustomCourseSurvey;