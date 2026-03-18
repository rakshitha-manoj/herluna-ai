import React from 'react';
import { motion } from 'motion/react';

export const SplashScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-luna-cream flex flex-col items-center justify-center overflow-hidden">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative flex flex-col items-center"
      >
        <img 
          src="/logo.png" 
          alt="HerLuna AI" 
          className="w-40 h-40 object-contain"
          onError={(e) => {
            // Fallback if logo.png doesn't exist yet
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-6 text-4xl font-serif text-luna-purple tracking-widest"
        >
          HERLUNA
        </motion.h1>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="mt-12 text-luna-purple/40 font-mono text-xs tracking-[0.3em] uppercase"
      >
        Lifestyle Intelligence
      </motion.div>
    </div>
  );
};
