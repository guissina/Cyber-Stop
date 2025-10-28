// frontend/src/App.jsx
import { Outlet, Link } from 'react-router-dom'
import { Home, Store } from 'lucide-react' // Adiciona ícone Store

export default function App() {
  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <nav className="bg-gray-800 p-4 flex justify-between items-center shadow-lg sticky top-0 z-20">
        <div className="flex gap-6 items-center"> {/* Aumenta o gap e centraliza verticalmente */}
          <Link to="/" className="hover:text-blue-400 flex items-center gap-1">
             <Home size={18}/> Lobby
          </Link>
          {/* ADICIONA LINK PARA A LOJA */}
          <Link to="/shop" className="hover:text-purple-400 flex items-center gap-1">
             <Store size={18}/> Loja
          </Link>
          {/* Adicione outros links aqui (ex: Perfil) */}
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('meuJogadorId');
            sessionStorage.removeItem('meuJogadorId'); // Limpa ambos
            location.href='/login'; // Redireciona para login
           }}
          className="bg-red-600 px-3 py-1 rounded hover:bg-red-700 text-sm"
        >
          Sair
        </button>
      </nav>
      {/* Adiciona um container com padding para o conteúdo */}
      <main className="p-4 md:p-8 max-w-7xl mx-auto"> 
        <Outlet /> {/* As rotas filhas (Lobby, Game, Shop) serão renderizadas aqui */}
      </main>
    </div>
  )
}