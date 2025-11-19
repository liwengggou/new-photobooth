import React, { useState } from 'react';
import { MonsterImage } from '../components/MonsterImage';
import { MouthShape } from '../types';

export const MonsterImageTest: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [mouthShape, setMouthShape] = useState<MouthShape>('neutral');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          Monster Image Component Test
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Main Monster Display */}
          <div className="bg-black/20 rounded-xl p-6">
            <h2 className="text-2xl font-semibold text-white mb-4 text-center">
              Monster Progress Display
            </h2>
            <MonsterImage
              progress={progress}
              mouthShape={mouthShape}
              showDebugControls={true}
              onProgressChange={setProgress}
              className="w-full"
            />
          </div>

          {/* Controls and Information */}
          <div className="space-y-6">
            {/* Progress Control */}
            <div className="bg-black/20 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">
                Manual Progress Control
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-white text-sm mb-2">
                    Progress: {progress}/6
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    value={progress}
                    onChange={(e) => setProgress(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {[0, 1, 2, 3, 4, 5, 6].map((stage) => (
                    <button
                      key={stage}
                      onClick={() => setProgress(stage)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        progress === stage
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      {stage}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mouth Shape Control */}
            <div className="bg-black/20 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">
                Mouth Shape (Future Attack Logic)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {(['neutral', 'aaa', 'eee', 'ooo'] as MouthShape[]).map((shape) => (
                  <button
                    key={shape}
                    onClick={() => setMouthShape(shape)}
                    className={`px-4 py-2 rounded transition-colors ${
                      mouthShape === shape
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    {shape.toUpperCase()}
                  </button>
                ))}
              </div>
              <p className="text-gray-300 text-sm mt-2">
                This will be connected to face detection for mouth-shape attacks
              </p>
            </div>

            {/* Progress Information */}
            <div className="bg-black/20 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">
                Damage Progression Info
              </h3>
              <div className="space-y-2 text-sm">
                <div className={`p-2 rounded ${progress === 0 ? 'bg-green-600/30' : 'bg-gray-700/30'}`}>
                  <span className="text-white font-medium">Stage 0:</span>
                  <span className="text-gray-300 ml-2">Healthy Monster</span>
                </div>
                <div className={`p-2 rounded ${progress === 1 ? 'bg-red-600/30' : 'bg-gray-700/30'}`}>
                  <span className="text-white font-medium">Stage 1:</span>
                  <span className="text-gray-300 ml-2">Head Damage - Stage 1</span>
                </div>
                <div className={`p-2 rounded ${progress === 2 ? 'bg-red-600/30' : 'bg-gray-700/30'}`}>
                  <span className="text-white font-medium">Stage 2:</span>
                  <span className="text-gray-300 ml-2">Head Damage - Stage 2</span>
                </div>
                <div className={`p-2 rounded ${progress === 3 ? 'bg-orange-600/30' : 'bg-gray-700/30'}`}>
                  <span className="text-white font-medium">Stage 3:</span>
                  <span className="text-gray-300 ml-2">Arm Damage - Stage 1</span>
                </div>
                <div className={`p-2 rounded ${progress === 4 ? 'bg-orange-600/30' : 'bg-gray-700/30'}`}>
                  <span className="text-white font-medium">Stage 4:</span>
                  <span className="text-gray-300 ml-2">Arm Damage - Stage 2</span>
                </div>
                <div className={`p-2 rounded ${progress === 5 ? 'bg-yellow-600/30' : 'bg-gray-700/30'}`}>
                  <span className="text-white font-medium">Stage 5:</span>
                  <span className="text-gray-300 ml-2">Leg Damage - Stage 1</span>
                </div>
                <div className={`p-2 rounded ${progress === 6 ? 'bg-yellow-600/30' : 'bg-gray-700/30'}`}>
                  <span className="text-white font-medium">Stage 6:</span>
                  <span className="text-gray-300 ml-2">Leg Damage - Stage 2</span>
                </div>
              </div>
            </div>

            {/* Auto Demo */}
            <div className="bg-black/20 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">
                Auto Demo
              </h3>
              <button
                onClick={() => {
                  let currentStage = 0;
                  const interval = setInterval(() => {
                    setProgress(currentStage);
                    currentStage++;
                    if (currentStage > 6) {
                      clearInterval(interval);
                      setProgress(0);
                    }
                  }, 1500);
                }}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Run Auto Demo
              </button>
              <p className="text-gray-300 text-sm mt-2">
                Automatically cycles through all damage stages
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonsterImageTest;