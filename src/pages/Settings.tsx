import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Shield, Sparkles, Upload, Save, LogOut, CheckCircle2, AlertCircle, Plus, Trash2, FileText, Calendar, BrainCircuit, History, Database, Copy } from 'lucide-react';

interface KnowledgeItem {
  id: string;
  source: string;
  content: string;
  date: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  active: boolean;
}

const REQUIRED_SQL = `
-- ATUALIZAÇÃO: ADICIONAR COLUNA DE CHECKLISTS (JSONB) SE NÃO EXISTIR
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS checklists JSONB DEFAULT '[]'::jsonb;
-- ATUALIZAÇÃO: ADICIONAR COLUNA DE RESPONSÁVEIS (JSONB)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignees JSONB DEFAULT '[]'::jsonb;
-- ATUALIZAÇÃO: ADICIONAR COLUNA DE TAGS (ARRAY TEXT)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- TABELA DE NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE ETIQUETAS DO SISTEMA
CREATE TABLE IF NOT EXISTS system_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  type TEXT CHECK (type IN ('product', 'cost_center', 'niche', 'task')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE COMENTÁRIOS DE TAREFAS
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT, 
  user_avatar TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE CONTATOS (CRM / ALUNOS)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  document TEXT,
  city TEXT,
  age TEXT,
  instagram TEXT,
  type TEXT CHECK (type IN ('lead', 'client', 'partner', 'student')) NOT NULL DEFAULT 'lead',
  status TEXT DEFAULT 'active',
  product_name TEXT,
  purchase_date DATE,
  ltv NUMERIC DEFAULT 0,
  niche TEXT,
  acquisition_channel TEXT,
  notes TEXT,
  address TEXT,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE TRANSAÇÕES FINANCEIRAS
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  status TEXT CHECK (status IN ('paid', 'pending')) DEFAULT 'pending',
  category TEXT,
  contact_id UUID REFERENCES contacts(id),
  due_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE PROJETOS
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'briefcase',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE STATUS DE TAREFAS
CREATE TABLE IF NOT EXISTS task_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  type TEXT CHECK (type IN ('not_started', 'active', 'done', 'closed')) DEFAULT 'not_started',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE TAREFAS
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  custom_id TEXT,
  project_id UUID REFERENCES projects(id),
  title TEXT NOT NULL,
  description TEXT,
  status_id UUID REFERENCES task_statuses(id),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  due_date TIMESTAMP WITH TIME ZONE,
  context_type TEXT,
  context_id UUID,
  contact_id UUID REFERENCES contacts(id),
  context_name TEXT,
  attachments TEXT[] DEFAULT '{}',
  checklists JSONB DEFAULT '[]'::jsonb,
  assignees JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE CONTEÚDO (POSTS)
CREATE TABLE IF NOT EXISTS content_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL,
  status TEXT NOT NULL,
  publish_date TIMESTAMP WITH TIME ZONE,
  drive_link TEXT,
  format TEXT,
  reference_link TEXT,
  approval_status TEXT DEFAULT 'pending',
  admin_comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE COMENTÁRIOS DE CONTEÚDO
CREATE TABLE IF NOT EXISTS content_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE MÉTRICAS DE ALUNOS
CREATE TABLE IF NOT EXISTS student_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  sales_count INTEGER DEFAULT 0,
  meetings_booked INTEGER DEFAULT 0,
  meetings_executed INTEGER DEFAULT 0,
  revenue_generated NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE MEMBROS DA EQUIPE
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;

export const Settings = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'ai' | 'db'>('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Profile State
  const [profileData, setProfileData] = useState({ name: '', email: '' });
  
  // AI Knowledge Base State
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeItem[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  
  // Team State (Agora conectado ao Banco)
  const [newUser, setNewUser] = useState({ email: '', role: 'member', name: '' });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    if (user) {
      setProfileData({ name: user.user_metadata?.full_name || '', email: user.email || '' });
      loadKnowledgeBase();
    }
    fetchTeamMembers();
  }, [user]);

  const loadKnowledgeBase = () => {
    if (!user) return;
    const kb = user.user_metadata?.ai_knowledge_base;
    if (Array.isArray(kb)) {
      setKnowledgeBase(kb);
    } else if (user.user_metadata?.ai_context) {
      setKnowledgeBase([{
        id: crypto.randomUUID(),
        source: 'Contexto Geral (Migrado)',
        content: user.user_metadata.ai_context,
        date: new Date().toISOString()
      }]);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase.from('team_members').select('*').order('created_at', { ascending: true });
      if (error) {
        if (!error.message.includes('does not exist')) {
            console.error("Erro ao buscar membros:", error);
        }
        return;
      }
      if (data) {
        setTeamMembers(data);
      }
    } catch (e) {
      console.error("Erro desconhecido ao buscar membros.");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: profileData.name } });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Perfil atualizado!' });
    } catch (error: any) { setMessage({ type: 'error', text: error.message }); } finally { setLoading(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        setCurrentInput(text);
        setCurrentFileName(file.name);
        setMessage({ type: 'success', text: `Arquivo "${file.name}" carregado. Clique em "Salvar e Treinar".` });
      }
    };
    reader.readAsText(file);
  };

  const handleAddToKnowledgeBase = async () => {
    if (!currentInput.trim()) return;
    setLoading(true);
    try {
      const newItem: KnowledgeItem = {
        id: crypto.randomUUID(),
        source: currentFileName || 'Entrada Manual',
        content: currentInput,
        date: new Date().toISOString()
      };
      const newKB = [newItem, ...knowledgeBase];
      const { error } = await supabase.auth.updateUser({ 
        data: { ai_knowledge_base: newKB, ai_context: null } 
      });

      if (error) throw error;
      setKnowledgeBase(newKB);
      setCurrentInput('');
      setCurrentFileName(null);
      setMessage({ type: 'success', text: 'Novo conhecimento memorizado!' });
    } catch (error: any) { 
      setMessage({ type: 'error', text: error.message }); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleDeleteKnowledge = async (id: string) => {
    if (!window.confirm('A IA irá esquecer este conteúdo. Confirmar?')) return;
    setLoading(true);
    try {
      const newKB = knowledgeBase.filter(item => item.id !== id);
      const { error } = await supabase.auth.updateUser({ data: { ai_knowledge_base: newKB } });
      if (error) throw error;
      setKnowledgeBase(newKB);
      setMessage({ type: 'success', text: 'Conteúdo removido.' });
    } catch (error: any) { setMessage({ type: 'error', text: error.message }); } finally { setLoading(false); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        const { data, error } = await supabase.from('team_members').insert([{
            name: newUser.name,
            role: newUser.role,
            email: newUser.email,
            active: true
        }]).select().single();

        if (error) throw error;

        setTeamMembers([...teamMembers, data]);
        setMessage({ type: 'success', text: `Usuário ${newUser.name} adicionado à equipe!` });
        setNewUser({ email: '', role: 'member', name: '' });
    } catch (error: any) {
        setMessage({ type: 'error', text: 'Erro ao salvar usuário: ' + error.message });
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
      if(!confirm('Remover este usuário da equipe?')) return;
      const { error } = await supabase.from('team_members').delete().eq('id', id);
      if (!error) {
          setTeamMembers(teamMembers.filter(m => m.id !== id));
      } else {
        setMessage({ type: 'error', text: 'Erro ao remover: ' + error.message });
      }
  };

  const copySQL = () => {
      navigator.clipboard.writeText(REQUIRED_SQL);
      setMessage({ type: 'success', text: 'SQL copiado! Cole no SQL Editor do Supabase.' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Configurações do Sistema</h2>
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 font-bold animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row min-h-[600px]">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200 p-4 space-y-2">
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-colors ${activeTab === 'profile' ? 'bg-white shadow-sm text-zenit-950 border border-gray-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}><User size={18}/> Meu Perfil</button>
          <button onClick={() => setActiveTab('team')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-colors ${activeTab === 'team' ? 'bg-white shadow-sm text-zenit-950 border border-gray-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}><Shield size={18}/> Equipe & Acesso</button>
          <button onClick={() => setActiveTab('ai')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-colors ${activeTab === 'ai' ? 'bg-white shadow-sm text-purple-700 border border-gray-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}><BrainCircuit size={18}/> Cérebro da IA</button>
          <button onClick={() => setActiveTab('db')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-colors ${activeTab === 'db' ? 'bg-white shadow-sm text-orange-700 border border-gray-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}><Database size={18}/> Instalação (SQL)</button>
          <div className="pt-8"><button onClick={signOut} className="flex items-center gap-2 text-red-600 hover:bg-red-50 w-full p-3 rounded-lg font-bold transition-colors"><LogOut size={20}/> Sair</button></div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto">
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-6 animate-in fade-in">
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2">Dados Pessoais</h3>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label><input type="text" value={profileData.name} onChange={e=>setProfileData({...profileData, name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-zenit-600 outline-none" /></div>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Email</label><input disabled value={profileData.email} className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500" /></div>
              <button disabled={loading} className="bg-zenit-600 text-zenit-950 px-8 py-3 rounded-lg hover:bg-zenit-500 font-bold shadow-md transition-all">Salvar Alterações</button>
            </form>
          )}

          {activeTab === 'team' && (
            <div className="space-y-8 animate-in fade-in">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Cadastrar Membro</h3>
                <form onSubmit={handleCreateUser} className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-5">
                   <div className="grid grid-cols-2 gap-5">
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Nome</label><input required className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white" value={newUser.name} onChange={e=>setNewUser({...newUser, name: e.target.value})} /></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Cargo/Função</label><select className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white" value={newUser.role} onChange={e=>setNewUser({...newUser, role: e.target.value})}><option value="admin">Administrador</option><option value="member">Membro</option><option value="editor">Editor</option></select></div>
                      <div className="col-span-2"><label className="block text-sm font-bold text-gray-700 mb-1">Email</label><input type="email" required className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white" value={newUser.email} onChange={e=>setNewUser({...newUser, email: e.target.value})} /></div>
                   </div>
                   <div className="flex justify-end">
                      <button disabled={loading} className="bg-zenit-600 text-zenit-950 px-6 py-2.5 rounded-lg hover:bg-zenit-500 font-bold flex items-center gap-2 shadow-sm transition-all"><Plus size={18}/> Salvar Membro</button>
                   </div>
                </form>
              </div>
              
              <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">Membros da Equipe</h3>
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="divide-y divide-gray-100">
                        {teamMembers.length === 0 && <p className="p-4 text-center text-gray-400">Nenhum membro encontrado.</p>}
                        {teamMembers.map((member) => (
                            <div key={member.id} className="p-4 flex items-center justify-between bg-white hover:bg-gray-50 group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-zenit-100 rounded-full flex items-center justify-center font-bold text-zenit-950 border border-zenit-200">{member.name.charAt(0).toUpperCase()}</div> 
                                    <div><p className="font-bold text-gray-900">{member.name}</p><p className="text-xs text-gray-500">{member.email} • <span className="uppercase font-bold">{member.role}</span></p></div>
                                </div>
                                <button onClick={() => handleDeleteUser(member.id)} className="text-gray-300 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                  </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6 animate-in fade-in">
               <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-purple-100 rounded-lg text-purple-700"><Sparkles size={24}/></div>
                 <div><h3 className="text-lg font-bold text-gray-900">Treinamento da IA</h3><p className="text-sm text-gray-500">Ensine sua IA sobre sua empresa.</p></div>
               </div>
               
               <div className="bg-white p-6 rounded-xl border border-purple-200 shadow-md space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-purple-500"></div>
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2"><Plus size={16} className="text-purple-600"/> Adicionar Novo Conhecimento</h4>
                    {currentFileName && <span className="text-xs font-bold bg-purple-100 text-purple-800 px-3 py-1 rounded-full flex items-center gap-2 border border-purple-200"><FileText size={12}/> {currentFileName} <button onClick={() => { setCurrentFileName(null); setCurrentInput(''); }} className="hover:text-red-500"><AlertCircle size={12}/></button></span>}
                  </div>
                  
                  <textarea 
                    value={currentInput} 
                    onChange={e => { setCurrentInput(e.target.value); if(!e.target.value) setCurrentFileName(null); }}
                    className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none text-gray-900 text-sm bg-gray-50 focus:bg-white transition-colors placeholder:text-gray-400"
                    placeholder="Cole textos de processos, vendas ou cultura da empresa..."
                  />

                  <div className="flex justify-between items-center pt-2">
                    <label className="cursor-pointer flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-purple-700 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100 border border-transparent hover:border-gray-200">
                      <Upload size={18}/> Upload .txt
                      <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden"/>
                    </label>

                    <button 
                      onClick={handleAddToKnowledgeBase} 
                      disabled={loading || !currentInput.trim()} 
                      className="flex items-center gap-2 bg-purple-700 text-white px-6 py-2.5 rounded-lg hover:bg-purple-600 shadow-md font-bold transition-all disabled:opacity-50"
                    >
                      {loading ? '...' : <Save size={18}/>} Salvar e Treinar
                    </button>
                  </div>
               </div>

               <div className="pt-4">
                 <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2"><History size={20} className="text-gray-400"/><h4 className="font-bold text-gray-800">Memória Aprendida</h4></div>
                   <span className="bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full text-xs font-bold border border-purple-200">{knowledgeBase.length} itens</span>
                 </div>
                 
                 <div className="space-y-3">
                   {knowledgeBase.length === 0 && <div className="text-center py-10 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200 text-gray-400 text-sm"><BrainCircuit size={32} className="mx-auto mb-2 opacity-20"/>Cérebro vazio.</div>}
                   {knowledgeBase.map((item) => (
                     <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-purple-300 transition-all">
                        <div className="flex items-start gap-4 overflow-hidden">
                           <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center shrink-0 border border-purple-100"><FileText size={20}/></div>
                           <div className="min-w-0">
                             <div className="flex items-center gap-2"><p className="font-bold text-gray-900 text-sm truncate">{item.source}</p><span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded font-bold border border-green-200 flex items-center gap-1"><CheckCircle2 size={10}/> APRENDIDO</span></div>
                             <p className="text-xs text-gray-500 mt-1">{new Date(item.date).toLocaleString()}</p>
                           </div>
                        </div>
                        <button onClick={() => handleDeleteKnowledge(item.id)} className="text-gray-400 hover:text-red-600 p-2"><Trash2 size={16}/></button>
                     </div>
                   ))}
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'db' && (
              <div className="space-y-6 animate-in fade-in">
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                      <div className="flex items-start gap-3">
                          <AlertCircle className="text-orange-600 mt-1" size={24} />
                          <div>
                              <h3 className="font-bold text-lg text-orange-900">Configuração Inicial do Banco de Dados</h3>
                              <p className="text-orange-800 mt-1 text-sm leading-relaxed">
                                  Como este é um ambiente novo, as tabelas necessárias para o sistema funcionar provavelmente ainda não existem.
                                  Copie o código SQL abaixo e execute no <strong>SQL Editor</strong> do seu painel Supabase.
                              </p>
                          </div>
                      </div>
                  </div>

                  <div className="relative group">
                      <div className="absolute top-2 right-2 z-10">
                          <button onClick={copySQL} className="flex items-center gap-2 bg-white/90 hover:bg-white text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border border-gray-200 transition-all">
                              <Copy size={14}/> Copiar SQL
                          </button>
                      </div>
                      <pre className="bg-gray-900 text-gray-100 p-6 rounded-xl overflow-x-auto text-xs font-mono border border-gray-700 leading-relaxed shadow-inner h-[500px]">
                          {REQUIRED_SQL}
                      </pre>
                  </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};