// src/components/game/PowerUpRadialMenu.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X } from 'lucide-react';

// Constantes para o layout
const RADIUS = 90; // Aumentei o raio para dar mais espaço
const START_ANGLE = -90; // Onde o primeiro item aparece (em graus, -90 = topo)
const ANGLE_SPREAD = 120; // O tamanho total do arco (ex: 120 graus)

export default function PowerUpRadialMenu({ inventario = [], onUsePowerUp, isLocked, timeLeft }) {
  const [isOpen, setIsOpen] = useState(false);

  const numItems = inventario.length;
  // Calcula o ângulo entre cada item
  const angleIncrement = numItems > 1 ? ANGLE_SPREAD / (numItems - 1) : 0;

  // Variantes para a animação do container (stagger)
  const menuVariants = {
    open: {
      transition: {
        staggerChildren: 0.07, // Anima cada filho com um pequeno delay
      },
    },
    closed: {
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1, // Reverte a animação ao fechar
      },
    },
  };

  // Variantes para a animação de cada item
  const itemVariants = {
    open: (index) => {
      // Calcula o ângulo final para este item
      const angle = START_ANGLE - (index * angleIncrement);
      
      // Converte o ângulo para radianos para calcular X e Y
      const x = Math.cos((angle * Math.PI) / 180) * RADIUS;
      const y = Math.sin((angle * Math.PI) / 180) * RADIUS;

      return {
        x: x,
        y: y,
        opacity: 1,
        scale: 1,
        transition: { type: 'spring', stiffness: 300, damping: 15 },
      };
    },
    closed: {
      x: 0,
      y: 0,
      opacity: 0,
      scale: 0.5,
      transition: { duration: 0.2 },
    },
  };

  return (
    <div className="relative z-20"> {/* z-20 para ficar acima de outros elementos */}
      
      {/* Botões dos Power-ups (aparecem quando aberto) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute bottom-0 right-0" // Posiciona a origem
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
          >
            {inventario.map((p, i) => (
              <motion.button
                key={p.power_up_id}
                variants={itemVariants}
                custom={i} // Passa o índice para a variante calcular o ângulo
                onClick={() => onUsePowerUp(p)}
                disabled={isLocked || timeLeft === 0}
                // --- MUDANÇAS AQUI ---
                className="absolute bottom-0 right-0 flex items-center gap-2 h-10 px-4 bg-primary/90 border border-primary text-white rounded-full text-xs font-semibold shadow-lg shadow-primary/30
                           disabled:opacity-50 disabled:cursor-not-allowed transition-transform hover:scale-110"
                // Removi w-24, ajustei h-10 e px-4
                // --- FIM DAS MUDANÇAS ---
                title={`${p.nome} - ${p.descricao} (x${p.quantidade})`}
                style={{ originX: '100%', originY: '100%' }} // Pivota do canto inferior direito
              >
                {/* Ícone */}
                <Zap size={14} className="flex-shrink-0" />
                
                {/* Nome (agora completo e sem quebra de linha) */}
                <span className="whitespace-nowrap flex-shrink-0">{p.nome}</span>
                
                {/* Quantidade */}
                <span className="flex-shrink-0 bg-bg-primary text-secondary text-[10px] px-1.5 py-0.5 rounded-full ml-auto">{p.quantidade}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão de Toggle Principal */}
      <motion.button
        className={`relative z-30 flex items-center justify-center h-12 w-12 rounded-full shadow-lg
                    ${isOpen ? 'bg-red-600 hover:bg-red-700' : 'bg-secondary hover:bg-secondary/80'}`}
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.9 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={isOpen ? 'x' : 'zap'}
            initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
            transition={{ duration: 0.2 }}
          >
            {isOpen ? <X size={24} /> : <Zap size={24} />}
          </motion.div>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}