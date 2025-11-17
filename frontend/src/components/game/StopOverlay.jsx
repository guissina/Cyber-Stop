// src/components/game/StopOverlay.jsx
import { motion } from 'framer-motion';
import './StopOverlay.css';

function StopOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 1 } }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90"
    >
      <div className="scanline"></div>
      <motion.h1
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
        className="text-9xl font-extrabold text-white drop-shadow-lg stop-overlay-text"
        style={{ fontFamily: '"PunkCyber", sans-serif' }}
      >
        STOP!
      </motion.h1>
    </motion.div>
  );
}

export default StopOverlay;