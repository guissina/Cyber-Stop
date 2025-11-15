// src/components/game/JumpscareOverlay.jsx
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ghost } from 'lucide-react';

export default function JumpscareOverlay({
  imageUrl,
  soundUrl,
  onEnd = () => {},
  // durée fixa de 2s (ignore payload externo)
  duration = 2
}) {
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const onEndRef = useRef(onEnd); // mantenha a referência mais recente do onEnd
  const [audioBlocked, setAudioBlocked] = useState(false);

  // atualiza a ref sempre que onEnd mudar, sem reiniciar o timer
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    console.log('[JUMPSCARE OVERLAY] mount', { imageUrl, soundUrl });

    const dur = 2; // força 2 segundos

    // preload da imagem
    if (imageUrl) {
      const img = new Image();
      img.src = imageUrl;
    }

    // cria e tenta tocar audio
    if (soundUrl) {
      try {
        audioRef.current = new Audio(soundUrl);
        audioRef.current.preload = 'auto';
        audioRef.current.volume = 1.0;
        audioRef.current.play().catch((err) => {
          console.warn('[JUMPSCARE OVERLAY] autoplay bloqueado:', err);
          setAudioBlocked(true);
        });
      } catch (e) {
        console.error('[JUMPSCARE OVERLAY] erro ao criar audio:', e);
      }
    }

    // limpa timer anterior, se houver
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // setTimeout que chama a ref (onEndRef.current) - evita depender de onEnd diretamente
    timerRef.current = window.setTimeout(() => {
      console.log('[JUMPSCARE OVERLAY] timeout 2s disparado — chamando onEndRef.current()');
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      } catch (e) {}
      // chama a função mais recente armazenada em onEndRef
      try { onEndRef.current && onEndRef.current(); } catch (e) { console.error('[JUMPSCARE OVERLAY] onEnd erro:', e); }
    }, dur * 1000);

    return () => {
      console.log('[JUMPSCARE OVERLAY] unmount — limpando timer/audio');
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (audioRef.current) {
        try { audioRef.current.pause(); audioRef.current.currentTime = 0; } catch (e) {}
      }
    };
    // OBS: deliberadamente não incluí `onEnd` nas deps para evitar reloop; só imageUrl/soundUrl reiniciam o effect
  }, [imageUrl, soundUrl]);

  const tryEnableAudio = async () => {
    if (!soundUrl) return;
    if (!audioRef.current) audioRef.current = new Audio(soundUrl);
    try {
      await audioRef.current.play();
      setAudioBlocked(false);
    } catch (e) {
      console.warn('[JUMPSCARE OVERLAY] tryEnableAudio falhou:', e);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="jumpscare-overlay"
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 overflow-hidden"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        style={{ pointerEvents: 'auto' }}
      >
        <motion.div
          className="relative w-full h-full flex items-center justify-center"
          initial={{ scale: 0.95 }}
          animate={{ scale: [1, 1.08, 0.98, 1] }}
          transition={{ duration: 0.6 }}
        >
          {imageUrl ? (
            <motion.img
              src={imageUrl}
              alt="jumpscare"
              className="w-full h-full object-cover"
              style={{ imageRendering: 'pixelated' }}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.04, 0.98, 1] }}
              transition={{ duration: 0.6 }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <Ghost className="w-40 h-40 text-red-500 animate-pulse" />
            </div>
          )}

          {audioBlocked && (
            <button
              onClick={tryEnableAudio}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 text-black py-2 px-4 rounded shadow pointer-events-auto"
              style={{ zIndex: 101 }}
            >
              Ativar som
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
