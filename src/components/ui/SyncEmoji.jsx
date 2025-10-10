import React from "react";
import { motion } from "framer-motion";

const SyncEmoji = ({ type, size = 16, className = "" }) => {
  const commonProps = {
    width: size,
    height: size,
    className: className,
    style: { filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.3))' }
  };

  const animationProps = {
    animate: { 
      scale: [1, 1.1, 1],
      opacity: [0.8, 1, 0.8]
    },
    transition: { 
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  switch (type) {
    case 'wave':
      return (
        <motion.svg {...commonProps} {...animationProps} viewBox="0 0 24 24" fill="none">
          <path 
            d="M7 13c0-2 1.5-3.5 4-3.5s4 1.5 4 3.5" 
            stroke="#EF4444" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
          <circle cx="9" cy="10" r="1.5" fill="#EF4444" />
          <circle cx="15" cy="10" r="1.5" fill="#EF4444" />
          <motion.path 
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" 
            stroke="#EF4444" 
            strokeWidth="1.5" 
            fill="transparent"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
        </motion.svg>
      );
    
    case 'search':
      return (
        <motion.svg {...commonProps} {...animationProps} viewBox="0 0 24 24" fill="none">
          <motion.circle 
            cx="11" cy="11" r="8" 
            stroke="#EF4444" 
            strokeWidth="2" 
            fill="rgba(239,68,68,0.1)"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.path 
            d="m21 21-4.35-4.35" 
            stroke="#EF4444" 
            strokeWidth="2" 
            strokeLinecap="round"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <circle cx="11" cy="11" r="3" fill="#EF4444" opacity="0.6" />
        </motion.svg>
      );
    
    case 'target':
      return (
        <motion.svg {...commonProps} {...animationProps} viewBox="0 0 24 24" fill="none">
          <motion.circle 
            cx="12" cy="12" r="10" 
            stroke="#EF4444" 
            strokeWidth="2"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.circle 
            cx="12" cy="12" r="6" 
            stroke="#EF4444" 
            strokeWidth="2"
            animate={{ scale: [1, 0.9, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
          />
          <circle cx="12" cy="12" r="2" fill="#EF4444" />
        </motion.svg>
      );
    
    case 'chart':
      return (
        <motion.svg {...commonProps} {...animationProps} viewBox="0 0 24 24" fill="none">
          <motion.path 
            d="M3 3v18h18" 
            stroke="#EF4444" 
            strokeWidth="2"
          />
          <motion.path 
            d="m19 9-5 5-4-4-3 3" 
            stroke="#EF4444" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.circle cx="7" cy="13" r="2" fill="#EF4444" opacity="0.7" />
          <motion.circle cx="12" cy="8" r="2" fill="#EF4444" opacity="0.7" />
          <motion.circle cx="17" cy="12" r="2" fill="#EF4444" opacity="0.7" />
        </motion.svg>
      );
    
    case 'bulb':
      return (
        <motion.svg {...commonProps} {...animationProps} viewBox="0 0 24 24" fill="none">
          <motion.path 
            d="M9 21h6M12 3a6 6 0 0 1 6 6c0 3-2 4-2 7H8c0-3-2-4-2-7a6 6 0 0 1 6-6Z" 
            stroke="#EF4444" 
            strokeWidth="2" 
            fill="rgba(239,68,68,0.1)"
            animate={{ 
              fill: ["rgba(239,68,68,0.1)", "rgba(239,68,68,0.3)", "rgba(239,68,68,0.1)"] 
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.circle 
            cx="12" cy="9" r="2" 
            fill="#EF4444"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </motion.svg>
      );
    
    case 'sparkle':
      return (
        <motion.svg {...commonProps} {...animationProps} viewBox="0 0 24 24" fill="none">
          <motion.path 
            d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z" 
            stroke="#EF4444" 
            strokeWidth="1.5" 
            fill="#EF4444"
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360] 
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.circle 
            cx="18" cy="6" r="2" 
            fill="#EF4444" 
            opacity="0.6"
            animate={{ scale: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />
          <motion.circle 
            cx="6" cy="18" r="1.5" 
            fill="#EF4444" 
            opacity="0.4"
            animate={{ scale: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          />
        </motion.svg>
      );
    
    default:
      return <span style={{ color: '#EF4444' }}>•</span>;
  }
};

export default SyncEmoji;