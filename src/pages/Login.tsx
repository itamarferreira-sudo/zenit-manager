import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      navigate('/');
    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'Erro ao realizar login';
      if (msg.includes('Invalid API key')) {
        msg = 'Chave de API do Supabase inválida ou ausente. Verifique src/lib/supabase.ts.';
      } else if (msg.includes('Invalid login credentials')) {
        msg = 'Email ou senha incorretos.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zenit-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-zenit-800">
        <div className="bg-zenit-950 p-10 text-center border-b border-zenit-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-zenit-600"></div>
          <div className="w-20 h-20 bg-zenit-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-zenit-600/30">
            <span className="text-4xl font-bold text-zenit-950">Z</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-widest">ZENIT MANAGER</h1>
          <p className="text-gray-400 text-sm mt-2">Acesse seu workspace</p>
        </div>

        <div className="p-10 bg-white">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200 flex items-start gap-2 animate-in slide-in-from-top-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0"/>
                <div>
                  <span className="font-bold block mb-1">Erro de Acesso:</span>
                  {error}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-800">Email Corporativo</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-zenit-600 outline-none transition-all text-gray-900 bg-white"
                placeholder="seu.nome@zenit.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-800">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-zenit-600 outline-none transition-all text-gray-900 bg-white"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zenit-600 hover:bg-zenit-500 text-zenit-950 font-bold py-3.5 rounded-lg transition-all shadow-md flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Acessando...
                </>
              ) : (
                'Entrar no Sistema'
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-gray-400">
            <p>IRF EDUC LTDA &copy; {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};