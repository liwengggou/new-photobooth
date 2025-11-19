import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Home, 
  Camera, 
  BarChart3, 
  Settings, 
  ArrowLeft,
  Users
} from 'lucide-react';

interface NavigationProps {
  showBackButton?: boolean;
  title?: string;
  showTopBar?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({ 
  showBackButton = false, 
  title,
  showTopBar = true
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/setup', icon: Camera, label: 'Setup' },
    { path: '/social', icon: Users, label: 'Social' },
    { path: '/progress', icon: BarChart3, label: 'Progress' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Top Navigation Bar */}
      {showTopBar && (showBackButton || title) && (
        <div className="absolute top-12 left-0 right-0 z-30 bg-white/10 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 py-3">
            {showBackButton && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(-1)}
                className="p-2 rounded-full bg-white/20 backdrop-blur-sm"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </motion.button>
            )}
            
            {title && (
              <h1 className="text-white text-lg font-semibold flex-1 text-center">
                {title}
              </h1>
            )}
            
            {showBackButton && <div className="w-9"></div>}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="absolute bottom-8 left-4 right-4 z-30">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/20 backdrop-blur-md rounded-2xl p-2"
        >
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <motion.button
                  key={item.path}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => navigate(item.path)}
                  className={`
                    relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200
                    ${active 
                      ? 'bg-white/30 text-white' 
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">{item.label}</span>
                  
                  {active && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white/20 rounded-xl"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Navigation;