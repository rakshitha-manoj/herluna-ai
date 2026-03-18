import React, { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Chat } from './Chat';

export const ChatBubble: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-24 right-6 z-[60]">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 bg-luna-purple text-white dark:text-black rounded-full flex items-center justify-center shadow-2xl shadow-luna-purple/40 group relative"
        >
          <div className="absolute inset-0 rounded-full bg-luna-purple animate-ping opacity-20 group-hover:opacity-0 transition-opacity" />
          <MessageSquare className="w-7 h-7 relative z-10" />
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[70] bg-luna-cream dark:bg-luna-cream flex flex-col transition-colors duration-300"
          >
            <div className="absolute top-6 right-6 z-[80]">
              <button
                onClick={() => setIsOpen(false)}
                className="w-12 h-12 bg-black/5 dark:bg-white/10 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
              >
                <X className="w-6 h-6 dark:text-luna-purple" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <Chat />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
