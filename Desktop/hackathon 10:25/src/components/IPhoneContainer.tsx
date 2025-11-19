import React from 'react';
import { motion } from 'framer-motion';

interface IPhoneContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const IPhoneContainer: React.FC<IPhoneContainerProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {/* iPhone Frame */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        {/* iPhone Outer Frame */}
        <div className="relative bg-black rounded-[3rem] p-2 shadow-2xl">
          {/* iPhone Screen */}
          <div className="relative bg-black rounded-[2.5rem] overflow-hidden">
            {/* Dynamic Island */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-50">
              <div className="bg-black rounded-full w-32 h-6"></div>
            </div>
            
            {/* Screen Content */}
            <div 
              className={`
                relative w-[375px] h-[812px] bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 overflow-hidden rounded-[2.5rem]
                ${className}
              `}
              style={{}}
            >
              {/* Status Bar */}
              <div className="absolute top-0 left-0 right-0 h-12 bg-black/10 flex items-center justify-between px-6 pt-2 z-40">
                <div className="text-white text-sm font-semibold">
                  9:41
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-2 bg-white rounded-sm opacity-60"></div>
                  <div className="w-4 h-2 bg-white rounded-sm opacity-80"></div>
                  <div className="w-6 h-3 bg-white rounded-sm"></div>
                </div>
              </div>
              
              {/* App Content */}
              <div className="pt-12 h-full">
                {children}
              </div>
              
              {/* Home Indicator */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                <div className="w-32 h-1 bg-white/30 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Side Buttons */}
        <div className="absolute left-[-3px] top-20 w-1 h-8 bg-gray-800 rounded-l-lg"></div>
        <div className="absolute left-[-3px] top-32 w-1 h-12 bg-gray-800 rounded-l-lg"></div>
        <div className="absolute left-[-3px] top-48 w-1 h-12 bg-gray-800 rounded-l-lg"></div>
        <div className="absolute right-[-3px] top-32 w-1 h-16 bg-gray-800 rounded-r-lg"></div>
      </motion.div>
    </div>
  );
};

export default IPhoneContainer;