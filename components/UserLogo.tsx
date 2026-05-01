import React, { useState } from 'react';

export const UserLogo: React.FC = () => {
  const [imgError, setImgError] = useState(false);

  return (
    <div 
      className="absolute top-6 right-6 w-16 h-16 rounded-full overflow-hidden z-50 shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-transform hover:scale-110 cursor-pointer"
      style={{ mixBlendMode: 'screen' }}
      title="App Logo"
    >
      {!imgError ? (
        <img 
          src="/logo.jpg" 
          alt="App Logo" 
          className="w-full h-full object-cover"
          style={{ filter: 'invert(1)' }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full bg-black flex items-center justify-center text-white font-black text-3xl font-heading">
          R
        </div>
      )}
      
      {/* Vibrant animated gradient overlay that colorizes the white parts of the inverted image */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{ 
          background: 'linear-gradient(45deg, #ff00ff, #00ffff, #ff00ff)',
          backgroundSize: '200% 200%',
          mixBlendMode: 'multiply',
          animation: 'gradient-xy 3s ease infinite'
        }}
      />
    </div>
  );
};
