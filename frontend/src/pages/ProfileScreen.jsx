import { useState, useEffect } from 'react';
// Importamos o cliente 'api' que tem o interceptor de token
import api from '../lib/api'; 
// Opcional: para redirecionar se o usuário não estiver logado
// import { useNavigate } from 'react-router-dom';

function ProfileScreen() {
  const [profileData, setProfileData] = useState({
    nome_de_usuario: '',
    email: '',
  });

  const [loading, setLoading] = useState(true);
  // const navigate = useNavigate(); // Descomente se quiser redirecionar

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);

      try {
        // 1. Chamar o endpoint /auth/me do backend
        // O interceptor no 'api.js' vai adicionar o 'Authorization: Bearer ...'
        const { data } = await api.get('/auth/me');

        // 2. O backend (auth.js) retorna um objeto { jogador: { ... } }
        if (data.jogador) {
          setProfileData(data.jogador);
        } else {
          // Isso não deve acontecer se o /me funcionar, mas é bom ter
          console.log("Nenhum usuário logado encontrado.");
        }
      } catch (error) {
        console.error('Erro ao buscar perfil:', error.message);
        // Se der erro (ex: token inválido ou expirado),
        // podemos redirecionar para o login
        // navigate('/login'); 
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []); // O array de dependências vazio garante que isso rode apenas uma vez

  
  if (loading) {
    return <div className="text-white text-center p-10">Carregando...</div>;
  }

  return (
    <div className="flex justify-center p-8 text-white">
      <div className="w-full max-w-lg">
        <h1 className="text-4xl font-bold mb-8 text-center">Meu Perfil</h1>
        
        {/* Espaço para a Foto de Perfil Padrão (igual ao seu) */}
        <div className="flex justify-center mb-6">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 border-4 border-gray-600">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-20 w-20 md:h-24 md:w-24" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
              />
            </svg>
          </div>
        </div>

        {/* Informações do Perfil (Apenas Visualização) */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Nome de Usuário
            </label>
            {/* Usamos o dado do estado, com um fallback */}
            <div className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 p-3 shadow-sm sm:text-lg text-white cursor-target">
              {profileData.nome_de_usuario || 'Não encontrado'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Email
            </label>
            {/* Usamos o dado do estado, com um fallback */}
            <div className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 p-3 text-gray-400 shadow-sm sm:text-lg cursor-target">
              {profileData.email || 'Não encontrado'}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default ProfileScreen;