import React, { useEffect, useState } from 'react';

interface IdleSplashScreenProps {
  onDismiss: () => void;
}

const IdleSplashScreen: React.FC<IdleSplashScreenProps> = ({ onDismiss }) => {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    // Show hint after 2 seconds
    const timer = setTimeout(() => {
      setShowHint(true);
    }, 2000);

    // Listen for any user interaction to dismiss
    const handleInteraction = () => {
      onDismiss();
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('mousemove', handleInteraction);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('mousemove', handleInteraction);
    };
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary-600 via-primary-500 to-pink-500 animate-gradient">
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 8s ease infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-in;
        }
      `}</style>

      <div className="text-center">
        {/* Logo Container with floating animation */}
        <div className="animate-float mb-8">
          <div className="inline-block animate-pulse-slow">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 512 512"
              className="w-40 h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 drop-shadow-2xl"
            >
              <defs>
                <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#f0f9ff', stopOpacity: 1 }} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <rect width="512" height="512" rx="128" fill="url(#logo-grad)" fillOpacity="0.15"/>
              <g fill="white" filter="url(#glow)">
                <circle cx="256" cy="180" r="40" opacity="0.95"/>
                <path d="M256 240 Q200 280 180 340 Q175 360 180 380 Q190 410 220 420 Q240 425 256 420 Q272 425 292 420 Q322 410 332 380 Q337 360 332 340 Q312 280 256 240 Z" opacity="0.95"/>
                <ellipse cx="200" cy="200" rx="25" ry="35" opacity="0.8"/>
                <ellipse cx="312" cy="200" rx="25" ry="35" opacity="0.8"/>
              </g>
              <text
                x="256"
                y="480"
                fontFamily="Arial, sans-serif"
                fontSize="64"
                fontWeight="bold"
                fill="white"
                textAnchor="middle"
                filter="url(#glow)"
              >
                SW
              </text>
            </svg>
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 drop-shadow-lg">
          Sphyra Wellness
        </h1>

        {/* Tagline */}
        <p className="text-xl md:text-2xl text-white/90 mb-8 font-light">
          Il tuo centro di benessere
        </p>

        {/* Animated dots */}
        <div className="flex justify-center gap-2 mb-8">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>

        {/* Hint to dismiss - appears after 2 seconds */}
        {showHint && (
          <div className="animate-fade-in">
            <p className="text-white/80 text-sm md:text-base">
              Tocca un punto qualsiasi dello schermo o muovi il mouse per continuare
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IdleSplashScreen;
