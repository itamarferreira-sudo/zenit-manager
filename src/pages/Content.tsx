import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ContentItem, ContentStatus, ContentPlatform, ApprovalStatus, ContentComment } from '../types';
import { GoogleGenAI } from "@google/genai";
import { 
  LayoutGrid, Instagram, Youtube, Linkedin, Video, FileText, Sparkles, Calendar,
  Loader2, Trash2, Plus, Pencil, X, Check, XCircle, Cloud, Link as LinkIcon, MessageSquare, Send, AlertTriangle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Content = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [activeTab, setActiveTab] = useState<'board' | 'calendar'>('board');
  
  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modals
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [itemComments, setItemComments] = useState<ContentComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [modalTab, setModalTab] = useState<'details' | 'comments'>('details');

  // AI State
  const [aiTopic, setAiTopic] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiIdeas, setAiIdeas] = useState<string[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);

  // Manual Form State
  const [formData, setFormData] = useState({
    title: '', description: '', platform: 'instagram' as ContentPlatform, status: 'idea' as ContentStatus,
    publish_date: '', drive_link: '', format: 'reels', reference_link: '', admin_comments: ''
  });

  useEffect(() => { fetchContent(); }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase.from('content_items').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (e: any) {
      console.error("Erro ao buscar conteúdo:", JSON.stringify(e, null, 2));
    }
  };

  const fetchComments = async (itemId: string) => {
      const { data } = await supabase.from('content_comments').select('*').eq('content_item_id', itemId).order('created_at');
      setItemComments(data || []);
  };

  const openManualModal = (item?: ContentItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title, description: item.description || '', platform: item.platform, status: item.status,
        publish_date: item.publish_date ? item.publish_date.split('T')[0] : '',
        drive_link: item.drive_link || '', format: item.format || 'reels', reference_link: item.reference_link || '', admin_comments: item.admin_comments || ''
      });
      fetchComments(item.id);
    } else {
      setEditingItem(null);
      setFormData({ title: '', description: '', platform: 'instagram', status: 'idea', publish_date: '', drive_link: '', format: 'reels', reference_link: '', admin_comments: '' });
      setItemComments([]);
    }
    setModalTab('details');
    setIsEditModalOpen(true);
  };

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, publish_date: formData.publish_date ? new Date(formData.publish_date).toISOString() : null };
    try {
        if (editingItem) {
          const { error } = await supabase.from('content_items').update(payload).eq('id', editingItem.id);
          if (error) throw error;
          setItems(items.map(i => i.id === editingItem.id ? { ...i, ...payload, id: i.id } as ContentItem : i));
        } else {
          const { data, error } = await supabase.from('content_items').insert([payload]).select().single();
          if (error) throw error;
          if (data) setItems([data, ...items]);
        }
        setIsEditModalOpen(false);
    } catch (e: any) {
        console.error(JSON.stringify(e, null, 2));
        alert('Erro ao salvar conteúdo: ' + e.message);
    }
  };

  const handleAddComment = async () => {
      if(!editingItem || !newComment.trim()) return;
      const { data, error } = await supabase.from('content_comments').insert([{ content_item_id: editingItem.id, user_id: user?.id, content: newComment }]).select().single();
      if(error) {
          alert('Erro ao comentar: ' + error.message);
          return;
      }
      if(data) {
          setItemComments([...itemComments, data]);
          setNewComment('');
      }
  };

  const updateApproval = async (id: string, status: ApprovalStatus) => {
    const { error } = await supabase.from('content_items').update({ approval_status: status }).eq('id', id);
    if (error) alert('Erro ao atualizar aprovação: ' + error.message);
    else setItems(items.map(i => i.id === id ? { ...i, approval_status: status } : i));
  };

  const handleGenerateIdeas = async () => {
    if (!aiTopic.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setAiIdeas([]);

    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("Chave de API não configurada (process.env.API_KEY missing).");
      }

      const { data: { user } } = await supabase.auth.getUser();
      let context = '';
      const kb = user?.user_metadata?.ai_knowledge_base;
      
      if (Array.isArray(kb) && kb.length > 0) {
        context = kb.map((item: any) => `FONTE: ${item.source} (Data: ${item.date})\nCONTEÚDO:\n${item.content}`).join('\n\n----------------\n\n');
      } else {
        context = "Não há informações específicas sobre a empresa. Gere ideias genéricas mas profissionais.";
      }
      
      const prompt = `
      Você é um estrategista de conteúdo sênior.
      CONTEXTO DA EMPRESA (Base de Conhecimento): ${context}
      TAREFA: Gere 5 ideias de títulos/headlines criativas e virais para a plataforma Instagram/TikTok sobre o tema: "${aiTopic}".
      FORMATO DE RESPOSTA: Retorne APENAS a lista com os 5 títulos, um por linha.
      `;
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: prompt 
      });

      const rawText = response.text || '';
      const ideasList = rawText.split('\n').filter(l => l.trim().length > 0);
      setAiIdeas(ideasList);
    } catch (e: any) { 
      setAiError(e.message || "Erro ao conectar com a IA.");
    } finally { 
      setAiLoading(false); 
    }
  };

  // --- CALENDAR LOGIC ---
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Empty slots for days before first day of month
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="bg-gray-50/30 border border-gray-100 min-h-[120px]"></div>);
    }

    // Days of month
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const daysItems = items.filter(i => i.publish_date && i.publish_date.startsWith(dateStr));

        days.push(
            <div key={d} className="bg-white border border-gray-200 min-h-[120px] p-2 hover:bg-gray-50 transition-colors group relative">
                <span className="text-sm font-bold text-gray-500 mb-2 block">{d}</span>
                <div className="space-y-1">
                    {daysItems.map(item => (
                        <div 
                           key={item.id} 
                           onClick={() => openManualModal(item)}
                           className={`text-[10px] p-1.5 rounded cursor-pointer border truncate font-bold shadow-sm ${
                               item.status === 'published' ? 'bg-green-100 text-green-800 border-green-200' : 
                               item.status === 'scheduled' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                               'bg-gray-100 text-gray-700 border-gray-200'
                           }`}
                           title={item.title}
                        >
                           {item.title}
                        </div>
                    ))}
                    <button 
                        onClick={() => {
                             setEditingItem(null); 
                             setFormData(prev => ({...prev, publish_date: dateStr, status: 'scheduled'})); 
                             setIsEditModalOpen(true);
                        }}
                        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-zenit-600 hover:bg-zenit-100 rounded"
                    >
                        <Plus size={14}/>
                    </button>
                </div>
            </div>
        );
    }
    return days;
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
           <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><LayoutGrid className="text-zenit-600"/> Gestão de Conteúdo</h2>
           <div className="flex bg-white border border-gray-200 p-1 rounded-lg shadow-sm">
              <button onClick={()=>setActiveTab('board')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab==='board'?'bg-zenit-100 text-zenit-950':'text-gray-500 hover:text-gray-900'}`}>Board</button>
              <button onClick={()=>setActiveTab('calendar')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab==='calendar'?'bg-zenit-100 text-zenit-950':'text-gray-500 hover:text-gray-900'}`}>Calendário</button>
           </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => openManualModal()} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-bold text-sm"><Plus size={18}/> Novo Post</button>
          <button onClick={() => setIsAiModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg shadow-md hover:bg-purple-500 transition-all font-bold text-sm"><Sparkles size={18}/> Gerar Ideias</button>
        </div>
      </div>

      {activeTab === 'board' ? (
          <div className="flex-1 overflow-x-auto pb-4">
              <div className="flex gap-6 h-full min-w-[1400px]">
                {['idea', 'scripting', 'production', 'scheduled', 'published'].map(status => (
                  <div key={status} className="flex-1 min-w-[280px] bg-gray-100/50 rounded-xl p-4 flex flex-col h-full border border-gray-200">
                    <div className="flex items-center justify-between mb-4 px-1">
                      <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wider">{status === 'idea' ? 'Banco de Ideias' : status}</h3>
                      <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full text-gray-600 font-bold">{items.filter(i=>i.status===status).length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3">
                      {items.filter(i => i.status === status).map(item => (
                        <div key={item.id} onClick={() => openManualModal(item)} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all group cursor-pointer relative border-l-4 border-l-gray-300 hover:border-l-zenit-600">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold uppercase text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{item.platform}</span>
                            {item.status === 'idea' && (
                              <div className="flex gap-1" onClick={e=>e.stopPropagation()}>
                                <button onClick={()=>updateApproval(item.id, 'approved')} className={`p-1 rounded hover:bg-green-100 ${item.approval_status==='approved'?'text-green-600':'text-gray-300'}`}><Check size={14}/></button>
                                <button onClick={()=>updateApproval(item.id, 'rejected')} className={`p-1 rounded hover:bg-red-100 ${item.approval_status==='rejected'?'text-red-600':'text-gray-300'}`}><XCircle size={14}/></button>
                              </div>
                            )}
                          </div>
                          <h4 className="font-bold text-gray-900 text-sm mb-2 leading-snug">{item.title}</h4>
                          {item.drive_link && <div className="flex items-center gap-1 text-xs text-blue-700 mb-2 bg-blue-50 w-fit px-2 py-1 rounded font-bold border border-blue-100"><Cloud size={12}/> Drive</div>}
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                            <span className="text-xs text-gray-500 font-medium flex items-center gap-1"><Calendar size={12}/> {item.publish_date ? new Date(item.publish_date).toLocaleDateString() : 'S/ data'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
          </div>
      ) : (
          <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
             <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-4">
                   <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-1 hover:bg-gray-200 rounded"><ChevronLeft size={20}/></button>
                   <h3 className="font-bold text-lg capitalize text-gray-900">{currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
                   <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-1 hover:bg-gray-200 rounded"><ChevronRight size={20}/></button>
                </div>
             </div>
             <div className="grid grid-cols-7 bg-gray-100 border-b border-gray-200">
                {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'].map(d => (
                   <div key={d} className="py-2 text-center text-xs font-bold text-gray-500">{d}</div>
                ))}
             </div>
             <div className="flex-1 grid grid-cols-7 overflow-y-auto">
                 {renderCalendar()}
             </div>
          </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl h-[85vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50"><h3 className="font-bold text-lg text-gray-900">Detalhes do Conteúdo</h3><button onClick={()=>setIsEditModalOpen(false)}><X size={20}/></button></div>
            
            {editingItem && (
                <div className="flex border-b border-gray-200 bg-white">
                    <button onClick={()=>setModalTab('details')} className={`flex-1 py-3 font-bold text-sm border-b-2 transition-colors ${modalTab==='details'?'border-zenit-600 text-zenit-900':'border-transparent text-gray-500 hover:text-gray-700'}`}>Detalhes</button>
                    <button onClick={()=>setModalTab('comments')} className={`flex-1 py-3 font-bold text-sm border-b-2 flex items-center justify-center gap-2 transition-colors ${modalTab==='comments'?'border-zenit-600 text-zenit-900':'border-transparent text-gray-500 hover:text-gray-700'}`}><MessageSquare size={16}/> Comentários</button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-8 bg-white">
                {modalTab === 'details' ? (
                    <form onSubmit={handleSaveContent} className="space-y-5">
                        <div><label className="text-sm font-bold text-gray-700 mb-1 block">Título / Headline</label><input required className="w-full p-3 border border-gray-300 rounded-lg text-gray-900" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} /></div>
                        <div className="grid grid-cols-2 gap-5">
                            <div><label className="text-sm font-bold text-gray-700 mb-1 block">Plataforma</label><select className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white" value={formData.platform} onChange={e=>setFormData({...formData, platform: e.target.value as any})}><option value="instagram">Instagram</option><option value="youtube">YouTube</option><option value="tiktok">TikTok</option></select></div>
                            <div><label className="text-sm font-bold text-gray-700 mb-1 block">Status</label><select className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white" value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value as any})}><option value="idea">Ideia</option><option value="production">Produção</option><option value="scheduled">Agendado</option></select></div>
                            <div><label className="text-sm font-bold text-gray-700 mb-1 block">Data Publicação</label><input type="date" className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-900" value={formData.publish_date} onChange={e=>setFormData({...formData, publish_date: e.target.value})} /></div>
                            <div><label className="text-sm font-bold text-gray-700 mb-1 block">Formato</label><input className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-900" value={formData.format} onChange={e=>setFormData({...formData, format: e.target.value})} placeholder="Ex: Reels, Carrossel"/></div>
                        </div>
                        <div><label className="text-sm font-bold text-blue-700 flex items-center gap-2 mb-1"><LinkIcon size={14}/> Link do Drive (Arquivos)</label><input className="w-full p-2.5 border border-blue-200 rounded-lg bg-blue-50 text-blue-900" value={formData.drive_link} onChange={e=>setFormData({...formData, drive_link: e.target.value})} placeholder="https://drive.google.com/..." /></div>
                        <div><label className="text-sm font-bold text-gray-700 mb-1 block">Roteiro / Legenda</label><textarea className="w-full p-3 border border-gray-300 rounded-lg min-h-[100px] text-gray-900 resize-none" value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} /></div>
                        {editingItem && (
                            <div><label className="text-sm font-bold text-red-600 mb-1 block">Aprovação / Feedback Admin</label><textarea className="w-full p-3 border border-red-200 rounded-lg bg-red-50 text-red-900 resize-none" value={formData.admin_comments} onChange={e=>setFormData({...formData, admin_comments: e.target.value})} placeholder="Feedback sobre a ideia..." /></div>
                        )}
                        <div className="pt-4 flex justify-end gap-3"><button type="button" onClick={()=>setIsEditModalOpen(false)} className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Cancelar</button><button className="px-6 py-2 bg-zenit-600 text-zenit-950 rounded-lg font-bold shadow-md hover:bg-zenit-500">Salvar Post</button></div>
                    </form>
                ) : (
                    <div className="space-y-4">
                         <div className="space-y-3 mb-4 min-h-[300px]">
                           {itemComments.map(c => (
                              <div key={c.id} className="bg-gray-50 p-4 rounded-xl text-sm border border-gray-200">
                                 <p className="text-gray-900 leading-relaxed font-medium">{c.content}</p>
                                 <p className="text-[10px] text-gray-500 mt-2 text-right uppercase font-bold">{new Date(c.created_at).toLocaleString()}</p>
                              </div>
                           ))}
                           {itemComments.length === 0 && <p className="text-sm text-gray-400 text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">Nenhum comentário ainda.</p>}
                        </div>
                        <div className="flex gap-3 border-t border-gray-100 pt-4">
                           <input className="flex-1 p-3 border border-gray-300 rounded-lg text-sm text-gray-900" value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder="Escreva um comentário..." />
                           <button onClick={handleAddComment} className="bg-zenit-600 text-zenit-950 p-3 rounded-lg hover:bg-zenit-500 shadow-sm"><Send size={18}/></button>
                        </div>
                    </div>
                )}
            </div>
          </div>
        </div>
      )}
      
      {/* AI Modal */}
       {isAiModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-200">
             <div className="p-6 bg-purple-700 text-white flex justify-between items-center"><h3 className="font-bold text-lg">Gerador de Ideias (IA)</h3><button onClick={()=>setIsAiModalOpen(false)} className="hover:text-purple-200">✕</button></div>
             <div className="p-8">
               <label className="block text-sm font-bold text-gray-700 mb-2">Sobre o que você quer falar?</label>
               <input type="text" value={aiTopic} onChange={(e)=>setAiTopic(e.target.value)} placeholder="Ex: Dicas de produtividade..." className="w-full p-3 border border-gray-300 rounded-lg mb-4 text-gray-900" />
               
               {aiError && (
                 <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200 flex items-start gap-2">
                   <AlertTriangle size={14} className="shrink-0 mt-0.5"/>
                   <span>{aiError}</span>
                 </div>
               )}

               <button onClick={handleGenerateIdeas} disabled={aiLoading} className="w-full bg-purple-900 hover:bg-purple-800 text-white p-3.5 rounded-lg mb-6 font-bold flex justify-center shadow-lg transition-all disabled:opacity-70">
                  {aiLoading ? <span className="flex items-center gap-2"><Loader2 className="animate-spin"/> Analisando contexto...</span> : 'Gerar Ideias com Contexto'}
               </button>
               
               <div className="space-y-3 max-h-[300px] overflow-y-auto">
                 {aiIdeas.length === 0 && !aiLoading && !aiError && (
                   <p className="text-center text-gray-400 text-sm">As ideias aparecerão aqui.</p>
                 )}
                 {aiIdeas.map((idea, i) => (
                    <div key={i} className="bg-purple-50 p-4 rounded-lg border border-purple-100 text-sm text-purple-900 font-medium shadow-sm animate-in fade-in slide-in-from-bottom-2" style={{animationDelay: `${i * 100}ms`}}>{idea}</div>
                 ))}
               </div>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};