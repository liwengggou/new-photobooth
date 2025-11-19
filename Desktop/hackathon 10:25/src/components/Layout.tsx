import React from 'react';
import { IPhoneContainer } from './IPhoneContainer';
import { Navigation } from './Navigation';

interface LayoutProps {
  children: React.ReactNode;
  showBackButton?: boolean;
  title?: string;
  showNavigation?: boolean;
  showTopNavigation?: boolean;
  className?: string;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  showBackButton = false,
  title,
  showNavigation = true,
  showTopNavigation = true,
  className = ''
}) => {
  return (
    <IPhoneContainer className={className}>
      <div className="relative h-full w-full">
        {/* Navigation */}
        {showNavigation && (
          <Navigation 
            showBackButton={showBackButton} 
            title={title}
            showTopBar={showTopNavigation}
          />
        )}
        
        {/* Page Content */}
        <div className={`
          h-full w-full overflow-hidden
          ${showNavigation ? 'pb-24' : ''}
          ${(showTopNavigation && (showBackButton || title)) ? 'pt-16' : ''}
        `}>
          {children}
        </div>
      </div>
    </IPhoneContainer>
  );
};

export default Layout;