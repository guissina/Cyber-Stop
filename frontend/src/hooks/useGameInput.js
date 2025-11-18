// src/hooks/useGameInput.js
import { useState, useRef, useEffect } from 'react';
import api from '../lib/api';
import socket from '../lib/socket';

const scrambleChar = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz!@#$%^&*()_+-=[]{}|;:,.<>?';
  return chars[Math.floor(Math.random() * chars.length)];
};

export function useGameInput(gameState, salaId, meuJogadorId, isHacked) {
  const { rodadaId, isLocked } = gameState;

  const [answers, setAnswers] = useState({});
  const [skippedCategories, setSkippedCategories] = useState(new Set());
  const [disregardedCategories, setDisregardedCategories] = useState(new Set());
  const debounceTimers = useRef(new Map());

  useEffect(() => {
    setAnswers({});
    setSkippedCategories(new Set());
    setDisregardedCategories(new Set());
    
    for (const t of debounceTimers.current.values()) clearTimeout(t);
    debounceTimers.current.clear();

  }, [rodadaId]);

  async function autosaveAnswer(temaId, texto) {
    if (!rodadaId || isLocked) return;
    const key = String(temaId);

    const prev = debounceTimers.current.get(key);
    if (prev) clearTimeout(prev);

    const t = setTimeout(async () => {
      try {
        console.log(`Autosave: T:${temaId} V:'${texto}' R:${rodadaId}`);
        await api.post('/answers', {
          rodada_id: Number(rodadaId),
          tema_id: Number(temaId),
          texto: String(texto || '')
        });
      } catch (e) {
        console.error('Autosave fail', { rodadaId, temaId }, e?.response?.data || e);
      } finally {
        debounceTimers.current.delete(key);
      }
    }, 350);

    debounceTimers.current.set(key, t);
  }

  const updateAnswer = (temaId, texto) => {
    if (isLocked) return;
    if (skippedCategories.has(temaId)) return;
    if (disregardedCategories.has(temaId)) return;

    if (isHacked) {
      const originalValue = answers[temaId] || '';
      // Scramble only the newly typed character
      if (texto.length > originalValue.length) {
        const scrambledText = originalValue + scrambleChar();
        setAnswers(prev => ({ ...prev, [temaId]: scrambledText }));
        autosaveAnswer(temaId, scrambledText);
      } else {
        // Allow backspace
        setAnswers(prev => ({ ...prev, [temaId]: texto }));
        autosaveAnswer(temaId, texto);
      }
    } else {
      setAnswers(prev => ({ ...prev, [temaId]: texto }));
      autosaveAnswer(temaId, texto);
    }
  };

  const enviarRespostas = async (roundIdSnapshot, categoriasIgnoradas = new Set()) => {
    const rid = Number(roundIdSnapshot || rodadaId);
    if (!rid) return;

    console.log(`Enviando respostas finais para rodada ${rid} (ignorando ${categoriasIgnoradas.size} categorias)...`);
    for (const t of debounceTimers.current.values()) clearTimeout(t);
    debounceTimers.current.clear();

    const payloads = Object.entries(answers)
      .filter(([temaId]) => !categoriasIgnoradas.has(Number(temaId)))
      .filter(([, texto]) => typeof texto === 'string')
      .map(([temaId, texto]) => ({
        rodada_id: rid,
        tema_id: Number(temaId),
        texto: String(texto || '').trim()
      }));

    if (!payloads.length) {
        console.log("Nenhuma resposta válida para envio final.");
        return;
    }

    console.log("Payloads para envio final:", payloads);
    const results = await Promise.allSettled(payloads.map(p => api.post('/answers', p)));

    const fails = results.filter(r => r.status === 'rejected');
    if (fails.length) {
      console.error('Falhas no envio final:', fails.map(f => f.reason?.response?.data || f.reason?.message || f.reason));
    } else {
        console.log("Envio final concluído com sucesso.");
    }
  };

  const onStop = async () => {
    const rid = Number(rodadaId);
    if (!rid || isLocked) return;
    console.log(`Botão STOP pressionado por ${meuJogadorId} para rodada ${rid}`);
    
    try {
        await enviarRespostas(rid, skippedCategories);
    } catch (e) { console.error("Erro no envio final ao clicar STOP:", e) }

    socket.emit('player_wants_to_stop', {
      salaId: Number(salaId),
      roundId: rid,
      by: meuJogadorId
    });
  };

  const handleSkipCategory = (temaId) => {
      console.log(`Jogador ${meuJogadorId} pulou a categoria ${temaId}`);
      updateAnswer(temaId, '');
      setSkippedCategories(prev => new Set(prev).add(temaId));
  };

  const handleCategoryDisregarded = (temaId) => {
    console.log(`Categoria ${temaId} foi desconsiderada pelo oponente`);
    setDisregardedCategories(prev => new Set(prev).add(temaId));
    setAnswers(prev => {
      const newAnswers = { ...prev };
      delete newAnswers[temaId];
      return newAnswers;
    });
  };

  return {
    answers,
    updateAnswer,
    skippedCategories,
    setSkippedCategories,
    disregardedCategories,
    handleCategoryDisregarded,
    onStop,
    handleSkipCategory,
    enviarRespostas 
  };
}