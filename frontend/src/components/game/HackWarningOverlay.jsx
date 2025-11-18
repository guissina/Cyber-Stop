import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';

export default function HackWarningOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.3 }}
      className="absolute top-1/4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 p-4 bg-red-900/80 border-2 border-red-500 rounded-lg shadow-lg backdrop-blur-sm"
    >
      <ShieldAlert size={48} className="text-red-400 animate-pulse" />
      <h2 className="text-2xl font-bold text-red-400 uppercase tracking-widest">
        Keyboard Infected!
      </h2>
    </motion.div>
  );
}
