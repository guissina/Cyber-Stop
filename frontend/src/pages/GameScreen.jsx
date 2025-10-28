// frontend/src/pages/GameScreen.jsx
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api'; //
import socket, { joinRoom } from '../lib/socket'; //
import CategoryRow from '../components/CategoryRow'; //
// Ícones: Adiciona Ghost para jumpscare, remove ShieldAlert
import { Zap, Send, Loader2, Star, SkipForward, Eye, Ghost } from 'lucide-react'; //
import { motion, AnimatePresence } from 'framer-motion'; // Para animação do Jumpscare

// --- Componente Jumpscare Overlay ---
// (Pode ser movido para um arquivo separado se preferir)
function JumpscareOverlay({ imageUrl, soundUrl, onEnd }) { //
  useEffect(() => { //
    // Toca o som (se houver)
    let audio = null; //
    if (soundUrl) { //
      audio = new Audio(soundUrl); //
      audio.play().catch(e => console.error("Erro ao tocar som do jumpscare:", e)); //
    }

    // Define um timer para esconder o jumpscare
    const timer = setTimeout(onEnd, 1500); // Mostra por 1.5 segundos

    // Limpeza ao desmontar
    return () => { //
      clearTimeout(timer); //
      if (audio) { //
        audio.pause(); //
        audio.currentTime = 0; //
      }
    };
  }, [soundUrl, onEnd]); //

  return ( //
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 overflow-hidden pointer-events-none" // pointer-events-none para não bloquear cliques atrás
      initial={{ scale: 0.5, opacity: 0 }} //
      animate={{ scale: 1, opacity: 1 }} //
      exit={{ scale: 1.5, opacity: 0 }} //
      transition={{ duration: 0.2 }} //
    >
      {/* Idealmente, usar uma imagem de props ou uma padrão */}
      <motion.img
        // src={imageUrl || '/path/to/default/jumpscare.png'}
        src="https://www.showmetech.com.br/wp-content/uploads//2020/07/original-1920x1080-1.png" // URL de Exemplo - SUBSTITUA!
        alt="JUMPSCARE!" //
        className="max-w-[80vw] max-h-[80vh] object-contain" //
        initial={{ scale: 1 }} //
        animate={{ scale: [1, 1.2, 1, 1.1, 1] }} // Efeito de tremor/zoom rápido
        transition={{ duration: 0.5, times: [0, 0.1, 0.3, 0.4, 0.5] }} //
      />
       {/* Alternativa com Ícone: <Ghost className="w-64 h-64 text-red-500 animate-ping" /> */}
    </motion.div>
  );
}
// --- Fim do Componente Jumpscare Overlay ---


export default function GameScreen() { //
  const { salaId } = useParams(); //
  const navigate = useNavigate(); //
  const meuJogadorId = Number( //
    localStorage.getItem('meuJogadorId') || //
    sessionStorage.getItem('meuJogadorId') || // Pega de sessionStorage como fallback
    '0' //
  );

  // Estados do Jogo
  const [rodadaId, setRodadaId] = useState(null); //
  const [letra, setLetra] = useState(''); //
  const [temas, setTemas] = useState([]); //
  const [timeLeft, setTimeLeft] = useState(null); //
  const [answers, setAnswers] = useState({}); //
  const [skippedCategories, setSkippedCategories] = useState(new Set()); // Guarda IDs dos temas pulados nesta rodada

  // Estados de Resultado/Fim
  const [placarRodada, setPlacarRodada] = useState({}); //
  const [totais, setTotais] = useState({}); //
  const [finalizado, setFinalizado] = useState(false); //
  const [vencedor, setVencedor] = useState(null); //
  const [isLocked, setIsLocked] = useState(true); // Controla se inputs estão bloqueados

  // Estados para Power-ups e Efeitos
  const [inventario, setInventario] = useState([]); // Itens que o jogador possui
  const [loadingInventory, setLoadingInventory] = useState(false); // Carregando inventário
  const [showJumpscare, setShowJumpscare] = useState(false); // Controla exibição do Jumpscare
  const [jumpscareData, setJumpscareData] = useState({}); // Dados do jumpscare (atacante, img, som)
  const [activeSkipPowerUpId, setActiveSkipPowerUpId] = useState(null); // ID do power-up de skip ativado
  const [revealPending, setRevealPending] = useState(false); // Indica se revelação de resposta foi ativada
  const [revealedAnswer, setRevealedAnswer] = useState(null); // Guarda a resposta revelada { temaNome, resposta, oponenteId }

  // Ref para timers de debounce (auto-save)
  const debounceTimers = useRef(new Map()); //

  // Função para buscar o inventário do jogador na API (Adicionado log de erro)
  const fetchInventory = async () => { //
    console.log("Tentando buscar inventário..."); // Log
    setLoadingInventory(true); //
    try { //
      const { data } = await api.get('/shop/inventory'); // Chama a API
      setInventario(data?.inventario || []); //
      console.log("Inventário buscado com sucesso:", data?.inventario || []); // Log
    } catch (error) { //
      // Log de erro mais detalhado
      console.error("Erro detalhado ao buscar inventário:", error.response?.data || error.message || error); //
      // Poderia mostrar um erro para o usuário se necessário
    } finally { //
      setLoadingInventory(false); //
    }
  };


  // Efeito principal para configurar listeners do Socket.IO e limpeza (MODIFICADO)
  useEffect(() => { //
    console.log(`useEffect INICIADO. Tentando conectar socket e buscar inventário para sala ${salaId}...`); // Log inicial modificado

    // 1. ENTRAR NA SALA DO SOCKET PRIMEIRO
    joinRoom(salaId); //

    // 2. BUSCAR INVENTÁRIO (agora roda em paralelo com a conexão do socket)
    fetchInventory(); //

    // --- Handlers de Eventos Socket ---
    const onReady = (data) => { //
      console.log("round:ready recebido:", data); //
      setRodadaId(data.rodada_id); //
      setLetra(data.letra); //
      setTemas(data.temas || []); //
      setAnswers({}); // Limpa respostas anteriores
      setSkippedCategories(new Set()); // Limpa categorias puladas
      setTimeLeft(null); // Reseta timer
      setIsLocked(true); // Bloqueia inputs até 'started'
      setActiveSkipPowerUpId(null); // Reseta power-up de skip
      setRevealPending(false); // Reseta flag de revelação pendente
      setRevealedAnswer(null); // Limpa resposta revelada anteriormente
      setShowJumpscare(false); // Garante que jumpscare não está ativo
      setPlacarRodada({}); // Limpa placar da rodada anterior
      setFinalizado(false); // Reseta estado de finalizado
      setVencedor(null); // Limpa vencedor anterior
      // Limpa timers de debounce pendentes
      for (const t of debounceTimers.current.values()) clearTimeout(t); //
      debounceTimers.current.clear(); //
    };

    const onStarted = ({ duration }) => { //
      console.log("round:started recebido, duração:", duration); //
      setTimeLeft(duration); // Define o tempo inicial
      setIsLocked(false); // Desbloqueia inputs
    };

    const onTick = (t) => {
        // console.log("round:tick recebido:", t); // Log frequente, descomentar se necessário
        setTimeLeft(t); // Atualiza o tempo restante
    };

    // Evento que precede o fim da rodada (para travar inputs e enviar respostas finais)
    const onStopping = async ({ roundId }) => { //
      console.log("round:stopping recebido:", roundId); //
      setIsLocked(true); // Bloqueia inputs
      try { //
        // Envia respostas finais, ignorando as categorias marcadas como puladas
        await enviarRespostas(roundId, skippedCategories); //
      } catch (e) { //
        console.error('auto-send on stopping failed', e); //
      }
    };

    // Evento com os resultados da rodada
    const onEnd = ({ roundId, roundScore, totais }) => { //
      console.log("round:end recebido:", { roundId, roundScore, totais }); //
      setPlacarRodada(roundScore || {}); // Atualiza placar da rodada
      setTotais(totais || {}); // Atualiza totais acumulados
      setTimeLeft(null); // Limpa timer
      setIsLocked(true); // Mantém bloqueado
    };

    // Evento de fim de partida
    const onMatchEnd = ({ totais, vencedor }) => { //
      console.log("match:end recebido:", { totais, vencedor }); //
      setFinalizado(true); // Marca que a partida acabou
      setTotais(totais || {}); //
      setVencedor(vencedor); //
      setIsLocked(true); //
      fetchInventory(); // Rebusca inventário para ver moedas ganhas
    };

    // Evento para rebuscar o inventário (ex: após usar um power-up)
    const onInventoryUpdate = () => { //
        console.log("inventory:updated recebido"); //
        fetchInventory(); // Busca o inventário novamente
    };

    // --- Efeitos de Power-ups ---
    // Efeito Jumpscare recebido de um oponente
    const onJumpscareEffect = ({ attackerId, image, sound }) => { //
        console.log(`effect:jumpscare recebido de ${attackerId}`); //
        setJumpscareData({ attackerId, image, sound }); // Guarda dados (opcional)
        setShowJumpscare(true); // Ativa o overlay
    };

    // Efeito que habilita o botão de pular categoria
    const onEnableSkip = ({ powerUpId }) => { //
        console.log(`effect:enable_skip recebido para powerUpId: ${powerUpId}`); //
        setActiveSkipPowerUpId(powerUpId); // Armazena o ID do power-up ativo
    };

    // Efeito que revela a resposta de um oponente
    const onAnswerRevealed = ({ temaNome, resposta, oponenteId }) => { //
        console.log(`effect:answer_revealed recebido: Oponente=${oponenteId}, Tema=${temaNome}, Resposta=${resposta}`); //
        setRevealedAnswer({ temaNome, resposta, oponenteId }); // Armazena a resposta revelada
        setRevealPending(false); // Marca que a revelação ocorreu
    };

    // Confirmação de que o backend registrou o uso de um power-up
    const onPowerUpAck = ({ codigo, message }) => { //
        console.log(`powerup:ack recebido: ${codigo} - ${message}`); //
        if (codigo === 'REVEAL_OPPONENT_ANSWER') { //
            setRevealPending(true); // Marca que estamos aguardando a revelação
        }
    };

    // Erro ao tentar usar um power-up
    const onPowerUpError = ({ message }) => { //
        console.error("powerup:error recebido:", message); //
        alert(`Erro ao usar power-up: ${message}`); // Ou usar um toast/notificação
    };

    // Erro geral vindo do backend
    const onAppError = ({ context, message }) => { //
        console.error(`app:error recebido (${context}):`, message); //
        alert(`Ocorreu um erro no servidor (${context}). Tente novamente ou recarregue a página.`); //
    };


    // Registrar todos os listeners do Socket.IO
    socket.on('round:ready', onReady); //
    socket.on('round:started', onStarted); //
    socket.on('round:tick', onTick); //
    socket.on('round:stopping', onStopping); //
    socket.on('round:end', onEnd); //
    socket.on('match:end', onMatchEnd); //
    socket.on('inventory:updated', onInventoryUpdate); //
    socket.on('effect:jumpscare', onJumpscareEffect); //
    socket.on('effect:enable_skip', onEnableSkip); //
    socket.on('effect:answer_revealed', onAnswerRevealed); //
    socket.on('powerup:ack', onPowerUpAck); //
    socket.on('powerup:error', onPowerUpError); //
    socket.on('app:error', onAppError); //

    // Função de limpeza executada quando o componente é desmontado
    return () => { //
      console.log("Limpando listeners do GameScreen"); //
      // Desregistrar todos os listeners para evitar vazamentos de memória
      socket.off('round:ready', onReady); //
      socket.off('round:started', onStarted); //
      socket.off('round:tick', onTick); //
      socket.off('round:stopping', onStopping); //
      socket.off('round:end', onEnd); //
      socket.off('match:end', onMatchEnd); //
      socket.off('inventory:updated', onInventoryUpdate); //
      socket.off('effect:jumpscare', onJumpscareEffect); //
      socket.off('effect:enable_skip', onEnableSkip); //
      socket.off('effect:answer_revealed', onAnswerRevealed); //
      socket.off('powerup:ack', onPowerUpAck); //
      socket.off('powerup:error', onPowerUpError); //
      socket.off('app:error', onAppError); //

      // Limpar timers de debounce pendentes
      for (const t of debounceTimers.current.values()) clearTimeout(t); //
      debounceTimers.current.clear(); //
    };
  }, [salaId]); // Array de dependências do useEffect (roda novamente se salaId mudar)

  // Função para pedir ao backend para iniciar a partida (agora obsoleta aqui, mas mantida por segurança)
  const iniciarPartida = async () => { //
    setIsLocked(true); // Bloqueia botão enquanto processa
    try { //
        console.log(`Tentando iniciar partida na sala ${salaId}`); //
        await api.post('/matches/start', { sala_id: Number(salaId), duration: 20 }); // Duração fixa em 20s
        console.log(`Comando de início enviado para sala ${salaId}`); //
        // Não desbloqueia aqui, espera o evento 'round:started'
    } catch (error) { //
        console.error("Erro ao iniciar partida:", error.response?.data?.error || error.message); //
        alert(`Erro ao iniciar: ${error.response?.data?.error || error.message}`); //
        setIsLocked(false); // Desbloqueia se deu erro
    }
  };

  // ---- AUTOSAVE (debounced) ----
  // Função que envia a resposta para o backend após um pequeno atraso depois de digitar
  async function autosaveAnswer(temaId, texto) { //
    if (!rodadaId || isLocked) return; // Só salva se a rodada estiver ativa e não bloqueada
    const key = String(temaId); //

    const prev = debounceTimers.current.get(key); //
    if (prev) clearTimeout(prev); // Cancela envio anterior se digitar de novo

    const t = setTimeout(async () => { //
      try { //
        console.log(`Autosave: T:${temaId} V:'${texto}' R:${rodadaId}`); //
        await api.post('/answers', { //
          rodada_id: Number(rodadaId), //
          tema_id: Number(temaId), //
          texto: String(texto || '') // Garante que é string
        });
      } catch (e) { //
        console.error('Autosave fail', { rodadaId, temaId }, e?.response?.data || e); //
      } finally { //
        debounceTimers.current.delete(key); // Remove timer do mapa após execução
      }
    }, 350); // Atraso de 350ms

    debounceTimers.current.set(key, t); // Armazena o timer
  }

  // Atualiza o estado local 'answers' e agenda o auto-save
  const updateAnswer = (temaId, texto) => { //
    if (isLocked) return; // Ignora se bloqueado
    if (skippedCategories.has(temaId)) return; // Ignora se categoria pulada
    setAnswers(prev => ({ ...prev, [temaId]: texto })); //
    autosaveAnswer(temaId, texto); //
  };

  // Envia todas as respostas pendentes para o backend (usado no STOP ou fim do timer)
  const enviarRespostas = async (roundIdSnapshot, categoriasIgnoradas = new Set()) => { //
    const rid = Number(roundIdSnapshot || rodadaId); //
    if (!rid) return; //

    console.log(`Enviando respostas finais para rodada ${rid} (ignorando ${categoriasIgnoradas.size} categorias)...`); //
    // Cancela todos os auto-saves pendentes
    for (const t of debounceTimers.current.values()) clearTimeout(t); //
    debounceTimers.current.clear(); //

    // Cria lista de payloads para enviar
    const payloads = Object.entries(answers) //
      .filter(([temaId]) => !categoriasIgnoradas.has(Number(temaId))) // Ignora puladas
      .filter(([, texto]) => typeof texto === 'string') // Garante que é string
      .map(([temaId, texto]) => ({ //
        rodada_id: rid, //
        tema_id: Number(temaId), //
        texto: String(texto || '').trim() // Remove espaços extras
      }));

    if (!payloads.length) { //
        console.log("Nenhuma resposta válida para envio final."); //
        return; //
    }

    console.log("Payloads para envio final:", payloads); //
    // Envia todas as requisições em paralelo
    const results = await Promise.allSettled(payloads.map(p => api.post('/answers', p))); //

    // Verifica se houve falhas
    const fails = results.filter(r => r.status === 'rejected'); //
    if (fails.length) { //
      console.error('Falhas no envio final:', fails.map(f => f.reason?.response?.data || f.reason?.message || f.reason)); //
    } else { //
        console.log("Envio final concluído com sucesso."); //
    }
  };

  // Função chamada ao clicar no botão STOP
  const onStop = async () => { //
    const rid = Number(rodadaId); //
    if (!rid || isLocked) return; // Só funciona se rodada ativa e não bloqueado
    console.log(`Botão STOP pressionado por ${meuJogadorId} para rodada ${rid}`); //
    setIsLocked(true); // Bloqueia imediatamente

    try { //
        // Envia respostas finais, ignorando as puladas
        await enviarRespostas(rid, skippedCategories); //
    } catch (e) { console.error("Erro no envio final ao clicar STOP:", e) } //

    // Avisa o backend que o jogador clicou STOP
    socket.emit('round:stop', { //
      salaId: Number(salaId), //
      roundId: rid, //
      by: meuJogadorId //
    });
  };

  // --- FUNÇÃO PARA USAR POWER-UP ---
  const handleUsePowerUp = (powerUp) => { //
    if (!rodadaId || isLocked) { //
      alert("Aguarde a rodada estar ativa."); //
      return; //
    }

    let targetPlayerId = null; // Alvo (se aplicável)
    let confirmUse = true; // Se pede confirmação

    // Lógica específica por power-up antes de emitir
    if (powerUp.code === 'BLUR_OPPONENT_SCREEN_5S') { // Ou código do jumpscare
        confirmUse = window.confirm(`Usar "${powerUp.nome}" para assustar os oponentes?`); //
    } else if (powerUp.code === 'SKIP_OWN_CATEGORY') { //
        if (activeSkipPowerUpId) { alert("Pular Categoria já está ativo!"); return; } //
        confirmUse = window.confirm(`Ativar o power-up "${powerUp.nome}"? Você poderá pular UMA categoria.`); //
    } else if (powerUp.code === 'REVEAL_OPPONENT_ANSWER') { //
        if (revealPending) { alert("Você já ativou a revelação para esta rodada."); return; } //
         confirmUse = window.confirm(`Usar "${powerUp.nome}"? A resposta será mostrada no final da rodada.`); //
    }

    if (!confirmUse) return; // Cancela se o usuário não confirmar

    // Emitir evento para o backend processar o uso
    socket.emit('powerup:use', { //
      powerUpId: powerUp.power_up_id, //
      targetPlayerId: targetPlayerId // Envia null se não for direcionado
    });
    console.log(`Comando 'powerup:use' emitido para ${powerUp.code}`); //
    // O inventário será atualizado via 'inventory:updated' vindo do backend
  };

  // --- Função para PULAR uma categoria (chamada pelo botão Skip ao lado da categoria) ---
  const handleSkipCategory = (temaId) => { //
      // Só funciona se o power-up 'effect:enable_skip' foi recebido e a rodada não está bloqueada
      if (!activeSkipPowerUpId || isLocked) return; //

      console.log(`Jogador ${meuJogadorId} pulou a categoria ${temaId}`); //

      // 1. Limpa a resposta atual no estado local
      updateAnswer(temaId, ''); //
      // 2. Adiciona o ID do tema ao Set de categorias puladas
      setSkippedCategories(prev => new Set(prev).add(temaId)); //
      // 3. Desativa o poder de pular (consome o uso)
      setActiveSkipPowerUpId(null); //

  };


  // --- RENDERIZAÇÃO ---

  // Tela de Fim de Jogo
  if (finalizado) { //
    const isEmpate = vencedor?.empate; //
    const myScore = totais[meuJogadorId] || 0; //
    const isWinner = !isEmpate && vencedor?.jogador_id === meuJogadorId; //
    const isLoser = !isEmpate && vencedor?.jogador_id !== meuJogadorId; //
    const isTieParticipant = isEmpate && vencedor?.jogadores?.includes(meuJogadorId); //

    return ( //
      <div className="max-w-xl mx-auto text-white p-6 bg-gray-800 rounded-lg shadow-xl text-center"> {/* */}
        <h2 className="text-3xl font-bold mb-4">Partida encerrada!</h2> {/* */}

        {/* Mensagem de Resultado */}
        {isWinner && <p className="text-2xl text-yellow-400 font-semibold mb-3">🎉 Você Venceu! 🎉</p>} {/* */}
        {isLoser && <p className="text-2xl text-gray-400 font-semibold mb-3">😢 Você não venceu desta vez.</p>} {/* */}
        {isTieParticipant && <p className="text-2xl text-blue-400 font-semibold mb-3">🤝 Empate! 🤝</p>} {/* */}
        {isEmpate && !isTieParticipant && <p className="text-2xl text-gray-400 font-semibold mb-3">🤝 Empate entre outros jogadores.</p>} {/* */}

        {/* Detalhes do Vencedor/Empate */}
        {isEmpate ? ( //
          <p className="mb-2"> {/* */}
            <b>Empate</b> entre Jogadores <b className="text-blue-300">{Array.isArray(vencedor?.jogadores) ? vencedor.jogadores.join(' e ') : '-'}</b> {/* */}
            {' '}com <b className="text-yellow-300">{vencedor?.total ?? 0} pontos</b> cada. {/* */}
          </p>
        ) : ( //
          <p className="mb-2"> {/* */}
            Vencedor: Jogador <b className="text-yellow-300">{vencedor?.jogador_id ?? '-'}</b> com <b className="text-yellow-300">{vencedor?.total ?? 0} pontos</b>. {/* */}
          </p>
        )}
         <p className="mb-4">Sua pontuação final: <b className="text-xl text-cyan-400">{myScore}</b></p> {/* */}

        {/* Placar Final Detalhado */}
        <h3 className="mt-5 mb-2 font-medium text-lg">Placar Final Detalhado</h3> {/* */}
        <pre className="bg-gray-900 p-3 rounded mt-1 text-sm text-left overflow-x-auto max-h-40"> {/* */}
          {JSON.stringify(totais, null, 2)} {/* */}
        </pre>
        {/* Botão para voltar ao Lobby */}
        <button
            onClick={() => navigate('/')} //
            className="mt-6 bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded text-lg font-semibold transition-transform hover:scale-105" //
        >
            Voltar ao Lobby {/* */}
        </button>
      </div>
    );
  }

  // --- Tela Principal do Jogo ---
  return ( //
    // Container principal
    <div className={`max-w-3xl mx-auto text-white space-y-4 p-4 relative`}> {/* Adicionado relative para posicionar overlay */}

      {/* Overlay Jumpscare */}
      <AnimatePresence> {/* */}
        {showJumpscare && ( //
          <JumpscareOverlay //
            onEnd={() => setShowJumpscare(false)} // Função para esconder o overlay
          />
        )}
      </AnimatePresence>

      {/* Cabeçalho com informações da sala e timer */}
      <header className="flex items-center justify-between bg-gray-800 p-3 rounded-lg shadow sticky top-[72px] z-10"> {/* Ajuste 'top' se a altura da nav principal mudar */}
        <div className="text-sm"> {/* */}
            Sala <b className="font-mono text-cyan-400">#{salaId}</b> | Você: <b className="font-mono text-lime-400">{meuJogadorId}</b> {/* */}
        </div>
        {/* Timer */}
        <div className={`font-mono text-2xl font-bold tabular-nums ${timeLeft !== null && timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}> {/* */}
           ⏱ {timeLeft !== null ? `${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(timeLeft % 60).padStart(2, '0')}` : '--:--'} {/* */}
        </div>
      </header>

      {/* Mensagem de "Aguardando Início" ou Conteúdo da Rodada */}
      {!rodadaId && !finalizado ? ( //
        // Se a rodada ainda não começou
        <div className="text-center p-10 bg-gray-800 rounded-lg shadow"> {/* */}
            <p className="mb-4 text-xl text-gray-300">Aguardando início da partida...</p> {/* */}
            {/* O botão Iniciar só deve aparecer para o criador - LOGICA DE CRIADOR REMOVIDA DAQUI, POIS DEVE ESTAR NA WAITING SCREEN */}
            {/* Este botão só é um fallback caso a navegação da WaitingScreen falhe */}
            <button
              className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded text-lg font-bold disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto transition-transform hover:scale-105" //
              onClick={iniciarPartida} //
              disabled={isLocked} // Desabilita enquanto processa o clique
            >
              {isLocked && !timeLeft ? <Loader2 className="animate-spin" /> : <Star />} {/* Mostra loading ou estrela */} {/* */}
              Iniciar Partida (Fallback) {/* Texto alterado */}
            </button>
             <p className="text-xs text-gray-500 mt-2">(Normalmente iniciado na tela anterior)</p>
        </div>
      ) : ( //
        // Se a rodada está ativa ou acabou de terminar
        <>
          {/* Mostra a Letra da Rodada */}
          <div className="text-center bg-gray-800 p-3 rounded-lg shadow"> {/* */}
            <h2 className="text-2xl font-semibold"> {/* */}
              Letra da Rodada: <span className="font-mono text-4xl text-lime-400 ml-2">{letra || '?'}</span> {/* */}
            </h2>
          </div>

          {/* Linhas de Categoria com Botão Skip */}
          <div className="space-y-3"> {/* */}
            {(temas || []).map(t => { //
              const isSkipped = skippedCategories.has(t.id); // Verifica se esta categoria foi pulada
              return ( //
                // Container para a linha e botão skip
                <div key={t.id} className="flex items-center gap-2"> {/* */}
                   {/* Componente da linha de categoria */}
                   <CategoryRow
                      categoryName={t.nome} //
                      value={isSkipped ? '--- PULADO ---' : (answers[t.id] || '')} // Mostra 'PULADO' ou a resposta
                      onChange={e => updateAnswer(t.id, e.target.value)} // Atualiza estado ao digitar
                      isDisabled={isLocked || timeLeft === 0 || isSkipped} // Desabilita se bloqueado, tempo 0 ou pulado
                      inputClassName={isSkipped ? 'text-gray-500 italic bg-gray-800' : ''} // Estilo extra se pulado
                    />
                    {/* Botão de Pular */}
                    {activeSkipPowerUpId && !isSkipped && ( //
                         <button
                            onClick={() => handleSkipCategory(t.id)} // Chama a função de pular
                            disabled={isLocked || timeLeft === 0} // Desabilita se rodada inativa
                            className="bg-yellow-600 hover:bg-yellow-700 text-white p-2 rounded-lg disabled:opacity-50 transition-transform hover:scale-110" //
                            title="Pular esta categoria (usará o power-up)" //
                          >
                             <SkipForward size={20}/> {/* */}
                         </button>
                    )}
                </div>
               );
             })}
          </div>

          {/* Botões de Ação: STOP e Power-ups */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-6"> {/* */}
             {/* Botão STOP */}
            <button
              className="bg-red-600 px-8 py-3 rounded-lg text-xl font-bold hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed flex-grow md:flex-grow-0 transition-transform hover:scale-105" //
              onClick={onStop} //
              disabled={!rodadaId || isLocked || timeLeft === 0} // Desabilita se rodada inativa/bloqueada ou tempo 0
            >
              STOP! {/* */}
            </button>

            {/* Seção de Power-ups disponíveis */}
            <div className="flex items-center gap-2 flex-wrap justify-center md:justify-end flex-grow"> {/* */}
               <h3 className="text-sm font-semibold mr-2 text-cyan-300 w-full md:w-auto text-center md:text-right hidden sm:block">Power-ups:</h3> {/* */}
                {/* Mostra loading ou 'Nenhum' */}
                {loadingInventory && <Loader2 className="animate-spin text-cyan-400" />} {/* */}
                {!loadingInventory && inventario.length === 0 && <span className="text-xs text-gray-500 italic">Nenhum</span>} {/* */}
                {/* Mapeia os power-ups do inventário para botões */}
                {!loadingInventory && inventario.map(p => ( //
                    <button
                        key={p.power_up_id} //
                        onClick={() => handleUsePowerUp(p)} // Chama a função de usar
                        disabled={isLocked || timeLeft === 0} // Desabilita se rodada inativa
                        className="bg-gradient-to-br from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white px-3 py-1 rounded-full text-xs font-semibold shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-transform hover:scale-105" //
                        title={`${p.nome} - ${p.descricao} (x${p.quantidade})`} // Tooltip com detalhes
                    >
                        <Zap size={12} /> {p.nome} <span className="bg-indigo-900 text-cyan-200 text-[10px] px-1.5 py-0.5 rounded-full ml-1">{p.quantidade}</span> {/* Quantidade */} {/* */}
                    </button>
                ))}
            </div>
          </div>

          {/* Área de Resultados da Rodada / Revelação / Totais */}
          {(Object.keys(placarRodada).length > 0 || revealedAnswer || revealPending) && ( //
            <div className="mt-6 bg-gray-800 p-4 rounded-lg shadow space-y-4"> {/* Adicionado space-y-4 */} {/* */}

              {/* Seção para Resposta Revelada */}
              {revealedAnswer && ( //
                 <div className="p-3 bg-indigo-900/50 rounded border border-indigo-700"> {/* */}
                     <h4 className="font-semibold text-md text-cyan-300 flex items-center gap-1"><Eye size={16}/> Resposta Revelada!</h4> {/* */}
                     <p className="text-xs text-gray-400">(Resposta do Jogador {revealedAnswer.oponenteId})</p> {/* */}
                     <p className="mt-1"> {/* */}
                         <span className="text-gray-400">{revealedAnswer.temaNome}:</span>{' '} {/* */}
                         <b className="text-lg text-white font-mono break-words">{revealedAnswer.resposta || '(Vazio)'}</b> {/* break-words para respostas longas */} {/* */}
                     </p>
                 </div>
              )}
              {/* Mensagem enquanto espera a revelação */}
              {revealPending && !revealedAnswer && ( //
                  <div className="p-3 bg-indigo-900/50 rounded border border-indigo-700 text-center"> {/* */}
                     <p className="text-cyan-300 flex items-center justify-center gap-1"><Loader2 size={16} className="animate-spin"/> Aguardando revelação da resposta...</p> {/* */}
                  </div>
              )}

              {/* Placar da Rodada (mostrado apenas se disponível) */}
              {Object.keys(placarRodada).length > 0 && ( //
                <div> {/* Div para agrupar placar */} {/* */}
                  <h3 className="font-semibold text-lg mb-2 text-yellow-300">⭐ Placar da Rodada {rodadaId} ⭐</h3> {/* */}
                  <div className="space-y-1 text-sm"> {/* */}
                    {Object.entries(placarRodada).map(([tema, scores]) => ( //
                        <div key={tema} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-700/50 px-2 py-1 rounded gap-1 sm:gap-3"> {/* */}
                          <span className="text-gray-300 font-medium">{tema}:</span> {/* */}
                          <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs sm:text-sm"> {/* */}
                              {Object.entries(scores).map(([jId, pts]) => ( //
                                <span key={jId} className={Number(jId) === meuJogadorId ? 'text-lime-400' : 'text-cyan-400'}> {/* */}
                                  Jgdr {jId}: <b className={`font-bold ${pts > 0 ? (pts === 10 ? 'text-yellow-400' : 'text-orange-400') : 'text-gray-500'}`}>{pts}pts</b> {/* */}
                                </span>
                              ))}
                          </div>
                        </div>
                    ))}
                  </div>
                </div> // Fim div placar
              )}

               {/* Totais Acumulados (mostrado apenas se disponível) */}
               {Object.keys(totais).length > 0 && ( //
                 <div> {/* Div para agrupar totais */} {/* */}
                    <h3 className="font-semibold text-lg mt-4 mb-1 text-yellow-300">📊 Totais Acumulados</h3> {/* */}
                     <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm"> {/* */}
                       {Object.entries(totais).map(([jId, pts]) => ( //
                         <span key={jId} className={Number(jId) === meuJogadorId ? 'text-lime-400' : 'text-cyan-400'}> {/* */}
                            Jogador {jId}: <b className="text-xl">{pts}pts</b> {/* */}
                         </span>
                       ))}
                    </div>
                 </div> // Fim div totais
               )}

              {/* Mensagem "Aguardando próxima rodada" (só aparece se o placar já foi exibido) */}
              {Object.keys(placarRodada).length > 0 && ( //
                 <p className="text-center mt-4 text-gray-400 text-sm italic">Aguardando próxima rodada...</p> //
              )}
            </div> // Fim da div de resultados
          )}

          {/* Mostra Totais mesmo se placarRodada ainda não chegou */}
          {(Object.keys(placarRodada).length === 0 && !revealedAnswer && !revealPending && Object.keys(totais).length > 0 && !finalizado && rodadaId) && ( //
             <div className="mt-6 bg-gray-800 p-4 rounded-lg shadow"> {/* */}
                 <h3 className="font-semibold text-lg mb-1 text-yellow-300">📊 Totais Acumulados</h3> {/* */}
                 <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm"> {/* */}
                    {Object.entries(totais).map(([jId, pts]) => ( //
                        <span key={jId} className={Number(jId) === meuJogadorId ? 'text-lime-400' : 'text-cyan-400'}> {/* */}
                        Jogador {jId}: <b className="text-xl">{pts}pts</b> {/* */}
                        </span>
                    ))}
                 </div>
             </div>
          )}
        </>
      )}
    </div>
  )
}