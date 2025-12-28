import React, { useState, useEffect } from 'react';
import { Task, Checklist, ChecklistItem, Project, TaskStatus, Profile, TaskComment } from '../types';
import { supabase, uploadFile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  X, Calendar, Users, Flag, Play, CheckSquare, 
  MessageSquare, Plus, MoreHorizontal, 
  Trash2, ChevronRight, Layout, CheckCircle2, Circle, AlignLeft,
  Paperclip, Loader2, File, ExternalLink, Check, Save, Briefcase, Tag, Send
} from 'lucide-react';

interface TaskDetailModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedTask: Task) => void;
  projects: Project[];
  statuses: TaskStatus[];
  isNew?: boolean;
  onCreate?: (task: Task) => Promise<void>;
}

export const TaskDetailModal = ({ 
    task, isOpen, onClose, onUpdate, 
    projects, statuses, isNew = false, onCreate 
}: TaskDetailModalProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'activity' | 'comments'>('comments');
  const [uploading, setUploading] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  
  // Local state for basic fields
  const [localTitle, setLocalTitle] = useState(task.title);
  const [localDesc, setLocalDesc] = useState(task.description || '');

  // Team & Tags State
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [newTag, setNewTag] = useState('');
  
  // Comments State
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
      setLocalTitle(task.title);
      setLocalDesc(task.description || '');
      fetchTeam();
      if (!isNew) fetchComments();
  }, [task]);

  const fetchTeam = async () => {
      const { data } = await supabase.from('team_members').select('*');
      if (data) {
          // Map team_members table (has 'name') to Profile type (has 'full_name')
          setTeamMembers(data.map((m: any) => ({ 
              id: m.id,
              email: m.email,
              full_name: m.name, 
              role: m.role,
              avatar_url: '' 
          })));
      }
  };

  const fetchComments = async () => {
      const { data } = await supabase.from('task_comments')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: true });
      if (data) setComments(data);
  };

  if (!isOpen) return null;

  const projectStatuses = statuses.filter(s => s.project_id === task.project_id).sort((a,b) => a.order_index - b.order_index);
  const currentStatus = statuses.find(s => s.id === task.status_id) || projectStatuses[0] || { name: 'Indefinido', color: '#ccc' };
  
  const checklists = task.checklists || [];
  const assignees = task.assignees || [];
  const tags = task.tags || [];

  const handleFieldUpdate = async (field: keyof Task, value: any) => {
      const updated = { ...task, [field]: value };
      onUpdate(updated);
      if (!isNew) {
          await supabase.from('tasks').update({ [field]: value }).eq('id', task.id);
      }
  };

  const sendNotification = async (userId: string, title: string, message: string) => {
      if (userId === user?.id) return; // Não notificar a si mesmo
      await supabase.from('notifications').insert([{
          user_id: userId,
          title,
          message,
          link: `/tasks?taskId=${task.id}`,
          read: false
      }]);
  };

  // --- Logic for Assignees ---
  const toggleAssignee = async (member: Profile) => {
      const exists = assignees.find(a => a.id === member.id);
      let newAssignees;
      if (exists) {
          newAssignees = assignees.filter(a => a.id !== member.id);
      } else {
          newAssignees = [...assignees, member];
          // Notificar novo responsável
          sendNotification(
             member.id, 
             'Você foi atribuído a uma tarefa', 
             `Você foi adicionado à tarefa "${task.title}".`
          );
      }
      handleFieldUpdate('assignees', newAssignees);
  };

  // --- Logic for Tags ---
  const handleAddTag = async () => {
      if (!newTag.trim()) return;
      const cleanTag = newTag.trim();
      if (!tags.includes(cleanTag)) {
          const newTags = [...tags, cleanTag];
          handleFieldUpdate('tags', newTags);
      }
      setNewTag('');
  };

  const removeTag = async (tagToRemove: string) => {
      const newTags = tags.filter(t => t !== tagToRemove);
      handleFieldUpdate('tags', newTags);
  };

  // --- Logic for Checklists & Files (Existing) ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (!e.target.files || e.target.files.length === 0) return;
     if (isNew) { alert('Salve a tarefa antes de anexar arquivos.'); return; }
     
     const file = e.target.files[0];
     setUploading(true);
     try {
         const publicUrl = await uploadFile(file, 'tasks');
         const currentAttachments = task.attachments || [];
         const newAttachments = [...currentAttachments, publicUrl];
         handleFieldUpdate('attachments', newAttachments);
     } catch (error: any) {
         alert('Erro no upload: ' + error.message);
     } finally {
         setUploading(false);
     }
  };

  const handleCreateChecklist = async () => {
    if (!newItemText.trim()) return;
    let currentChecklists = [...checklists];
    if (currentChecklists.length === 0) {
        currentChecklists.push({
            id: crypto.randomUUID(),
            task_id: task.id,
            name: 'Checklist Geral',
            items: []
        });
    }
    const newItem: ChecklistItem = {
        id: crypto.randomUUID(),
        checklist_id: currentChecklists[0].id,
        content: newItemText,
        is_completed: false
    };
    currentChecklists[0].items.push(newItem);
    setNewItemText('');
    handleFieldUpdate('checklists', currentChecklists);
  };

  const toggleChecklistItem = async (cIdx: number, iIdx: number) => {
      const newChecklists = [...checklists];
      newChecklists[cIdx].items[iIdx].is_completed = !newChecklists[cIdx].items[iIdx].is_completed;
      handleFieldUpdate('checklists', newChecklists);
  };

  const deleteChecklistItem = async (cIdx: number, iIdx: number) => {
      const newChecklists = [...checklists];
      newChecklists[cIdx].items.splice(iIdx, 1);
      handleFieldUpdate('checklists', newChecklists);
  };

  // --- Comments Logic ---
  const handleSendComment = async () => {
      if (!newComment.trim() || isNew) return;
      
      const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';

      const payload = {
          task_id: task.id,
          user_id: user?.id,
          user_name: userName,
          content: newComment,
          created_at: new Date().toISOString()
      };

      try {
          const { data, error } = await supabase.from('task_comments').insert([payload]).select().single();
          if (error) throw error;
          if (data) {
              setComments([...comments, data]);
              setNewComment('');

              // Notificar todos os assignees (exceto quem comentou)
              assignees.forEach(assignee => {
                  sendNotification(
                      assignee.id,
                      `Novo comentário em "${task.title}"`,
                      `${userName} comentou: "${newComment.substring(0, 50)}${newComment.length>50?'...':''}"`
                  );
              });
          }
      } catch (error: any) {
          alert('Erro ao enviar comentário: ' + error.message);
      }
  };

  const deleteComment = async (commentId: string) => {
      if (!confirm('Apagar comentário?')) return;
      const { error } = await supabase.from('task_comments').delete().eq('id', commentId);
      if (!error) {
          setComments(comments.filter(c => c.id !== commentId));
      }
  };

  const handleSaveNewTask = async () => {
      if (!localTitle.trim()) { alert('Digite um título para a tarefa.'); return; }
      if (onCreate) {
          await onCreate({
              ...task,
              title: localTitle,
              description: localDesc
          });
      }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-end z-[60] animate-in fade-in duration-200">
      <div className="w-full max-w-[1200px] bg-white h-full shadow-2xl flex flex-col md:flex-row animate-in slide-in-from-right duration-300">
        
        {/* LEFT SIDE (Main) */}
        <div className="flex-1 flex flex-col border-r border-gray-200 bg-white overflow-hidden h-full">
          {/* Header */}
          <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0 gap-4">
             <div className="flex items-center gap-3 text-sm text-gray-500 flex-1 overflow-hidden">
                <select 
                    value={task.status_id}
                    onChange={(e) => handleFieldUpdate('status_id', e.target.value)}
                    className="px-2.5 py-1.5 rounded text-white text-xs font-bold uppercase tracking-wider outline-none cursor-pointer appearance-none text-center min-w-[100px]"
                    style={{backgroundColor: currentStatus.color}}
                >
                    {projectStatuses.map(s => (
                        <option key={s.id} value={s.id} className="text-black bg-white">{s.name}</option>
                    ))}
                </select>

                <ChevronRight size={14} className="text-gray-300 shrink-0" />
                
                <div className="flex items-center gap-2 truncate">
                    <Layout size={14} className="shrink-0"/> 
                    <select 
                        value={task.project_id}
                        onChange={(e) => {
                            const newProjStatuses = statuses.filter(s => s.project_id === e.target.value).sort((a,b)=>a.order_index-b.order_index);
                            const updated = { ...task, project_id: e.target.value, status_id: newProjStatuses[0]?.id };
                            onUpdate(updated);
                            if(!isNew) {
                                supabase.from('tasks').update({ project_id: e.target.value, status_id: newProjStatuses[0]?.id }).eq('id', task.id).then();
                            }
                        }}
                        className="bg-transparent hover:bg-gray-100 rounded px-1 py-0.5 outline-none cursor-pointer truncate max-w-[150px] font-medium"
                    >
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                {!isNew && <span className="font-mono text-xs text-gray-300 ml-auto hidden sm:block">{task.custom_id || `ID-${task.id.substring(0,4)}`}</span>}
             </div>
             
             <div className="flex gap-1 shrink-0">
                {!isNew && <button className="p-2 text-gray-400 hover:bg-gray-100 rounded transition-colors"><MoreHorizontal size={20}/></button>}
                <button onClick={onClose} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded transition-colors"><X size={20}/></button>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            {/* Title */}
            <input 
               className="text-2xl md:text-3xl font-bold text-gray-900 w-full border-none p-0 focus:ring-0 placeholder:text-gray-300 mb-6 bg-transparent"
               value={localTitle}
               onChange={(e) => setLocalTitle(e.target.value)}
               onBlur={() => !isNew && handleFieldUpdate('title', localTitle)}
               placeholder="O que precisa ser feito?"
               autoFocus={isNew}
            />

            {/* Description */}
            <div className="mb-8 group">
               <label className="text-xs font-bold text-gray-400 uppercase mb-2 block flex items-center gap-2"><AlignLeft size={14}/> Descrição</label>
               <textarea 
                  className="w-full p-4 border border-transparent group-hover:border-gray-200 rounded-xl min-h-[120px] text-gray-800 resize-none focus:border-zenit-600 bg-transparent focus:bg-gray-50 transition-all leading-relaxed placeholder:text-gray-400 text-sm"
                  value={localDesc}
                  onChange={(e) => setLocalDesc(e.target.value)}
                  onBlur={() => !isNew && handleFieldUpdate('description', localDesc)}
                  placeholder="Adicione detalhes, links ou contexto..."
               />
            </div>

            {/* Checklists */}
            <div className="mb-8">
               <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                  <label className="text-xs font-bold text-gray-400 uppercase block flex items-center gap-2"><CheckSquare size={14}/> Subtarefas</label>
               </div>
               
               <div className="space-y-3">
                  {checklists.map((checklist, cIdx) => (
                      <div key={checklist.id} className="space-y-1">
                          {checklist.items.map((item, iIdx) => (
                             <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded group transition-colors">
                                <button 
                                    onClick={() => toggleChecklistItem(cIdx, iIdx)}
                                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${item.is_completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent hover:border-green-500'}`}
                                >
                                    <Check size={14} strokeWidth={3} />
                                </button>
                                <span className={`text-sm flex-1 break-words ${item.is_completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{item.content}</span>
                                <button onClick={() => deleteChecklistItem(cIdx, iIdx)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                             </div>
                          ))}
                      </div>
                  ))}

                  <div className="flex items-center gap-2 mt-2 pl-2">
                      <Plus size={16} className="text-gray-400"/>
                      <input 
                        className="flex-1 bg-transparent border-none text-sm focus:ring-0 placeholder:text-gray-400"
                        placeholder="Adicionar item..."
                        value={newItemText}
                        onChange={e => setNewItemText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreateChecklist()}
                      />
                      <button onClick={handleCreateChecklist} disabled={!newItemText.trim()} className="text-xs font-bold text-zenit-600 disabled:opacity-50 hover:bg-zenit-50 px-2 py-1 rounded">Adicionar</button>
                  </div>
               </div>
            </div>
            
            {/* Tags (Mobile/Desktop main area backup, usually tags are in sidebar, but can be here too) */}
            <div className="md:hidden mb-8">
                <label className="text-xs font-bold text-gray-400 uppercase mb-3 block flex items-center gap-2"><Tag size={14}/> Etiquetas</label>
                <div className="flex flex-wrap gap-2">
                    {tags.map(t => (
                        <span key={t} className="px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-700 border border-gray-200">{t}</span>
                    ))}
                </div>
            </div>

            {/* Attachments */}
            <div className={`mb-8 ${isNew ? 'opacity-50 pointer-events-none' : ''}`}>
               <label className="text-xs font-bold text-gray-400 uppercase mb-3 block flex items-center gap-2"><Paperclip size={14}/> Anexos {isNew && '(Salve para adicionar)'}</label>
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {task.attachments?.map((url, idx) => (
                      <a href={url} target="_blank" rel="noopener noreferrer" key={idx} className="border border-gray-200 rounded-lg p-3 flex flex-col items-center justify-center gap-2 text-gray-600 hover:border-zenit-400 hover:bg-gray-50 transition-colors h-24 relative group">
                          <File size={24} className="text-zenit-600"/>
                          <span className="text-xs font-bold truncate w-full text-center">Arquivo {idx + 1}</span>
                          <ExternalLink size={12} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400"/>
                      </a>
                  ))}
                  <label className={`border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-zenit-400 hover:text-zenit-600 cursor-pointer transition-colors bg-gray-50 hover:bg-white h-24 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                     {uploading ? <Loader2 size={24} className="animate-spin text-zenit-600"/> : <Plus size={24}/>}
                     <span className="text-xs font-bold">{uploading ? 'Enviando...' : 'Upload'}</span>
                     <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </label>
               </div>
            </div>

            {/* Save Button for New Task */}
            {isNew && (
                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white pb-4">
                    <button onClick={onClose} className="px-6 py-3 rounded-lg text-gray-600 font-bold hover:bg-gray-100">Cancelar</button>
                    <button onClick={handleSaveNewTask} className="px-8 py-3 rounded-lg bg-zenit-600 text-zenit-950 font-bold shadow-lg hover:bg-zenit-500 hover:scale-105 transition-all flex items-center gap-2">
                        <Save size={18}/> Criar Tarefa
                    </button>
                </div>
            )}

            {/* Comments */}
            {!isNew && (
                <div className="border-t border-gray-200 pt-6">
                   <div className="flex gap-4 mb-6">
                      <button className="pb-2 text-sm font-bold border-b-2 border-zenit-600 text-gray-900">Comentários</button>
                   </div>
                   
                   <div className="space-y-4 mb-6">
                       {comments.map(c => (
                           <div key={c.id} className="flex gap-3 group">
                               <div className="w-8 h-8 rounded-full bg-gray-200 border border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                                   {c.user_name ? c.user_name.charAt(0).toUpperCase() : 'U'}
                               </div>
                               <div className="flex-1">
                                   <div className="flex items-center gap-2 mb-1">
                                       <span className="text-xs font-bold text-gray-800">{c.user_name || 'Usuário'}</span>
                                       <span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleString()}</span>
                                       {c.user_id === user?.id && (
                                            <button onClick={()=>deleteComment(c.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 p-0.5"><Trash2 size={12}/></button>
                                       )}
                                   </div>
                                   <div className="bg-gray-50 p-3 rounded-lg rounded-tl-none border border-gray-100 text-sm text-gray-700 leading-relaxed">
                                       {c.content}
                                   </div>
                               </div>
                           </div>
                       ))}
                       {comments.length === 0 && (
                           <p className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded border border-dashed border-gray-200">Nenhum comentário. Seja o primeiro a comentar!</p>
                       )}
                   </div>

                   <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-full bg-zenit-600 text-zenit-950 flex items-center justify-center font-bold text-xs shrink-0 border border-zenit-400">
                          {user?.user_metadata?.full_name?.charAt(0) || 'EU'}
                      </div>
                      <div className="flex-1">
                         <div className="relative">
                            <textarea 
                                className="w-full border border-gray-200 rounded-lg p-3 pr-12 text-sm focus:ring-2 focus:ring-zenit-600 outline-none resize-none bg-gray-50 focus:bg-white transition-colors" 
                                placeholder="Escreva um comentário..." 
                                rows={2}
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendComment())}
                            />
                            <button 
                                onClick={handleSendComment}
                                disabled={!newComment.trim()}
                                className="absolute bottom-2 right-2 bg-zenit-900 text-white p-1.5 rounded-md hover:bg-zenit-700 disabled:opacity-50 transition-colors"
                            >
                                <Send size={14}/>
                            </button>
                         </div>
                         <p className="text-[10px] text-gray-400 mt-1 pl-1">Pressione Enter para enviar</p>
                      </div>
                   </div>
                </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE (30%) - Sidebar */}
        <div className="w-full md:w-[320px] bg-gray-50 flex flex-col border-l border-gray-200 shrink-0 overflow-y-auto custom-scrollbar h-full">
           <div className="p-6 space-y-6">
              
              {/* Context Info */}
              {task.context_name && (
                  <div className="p-3 bg-purple-100 border border-purple-200 rounded-lg">
                      <label className="text-[10px] font-bold text-purple-600 uppercase flex items-center gap-1 mb-1"><Briefcase size={10}/> Vinculado a</label>
                      <p className="font-bold text-purple-900 text-sm">{task.context_name}</p>
                      <p className="text-xs text-purple-700 capitalize">{task.context_type?.replace('_', ' ')}</p>
                  </div>
              )}

              {/* PRIORITY */}
              <div className="space-y-1">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Prioridade</label>
                 <div className="grid grid-cols-2 gap-2">
                    {['low', 'medium', 'high', 'urgent'].map(p => (
                        <button 
                            key={p}
                            onClick={() => handleFieldUpdate('priority', p)}
                            className={`px-2 py-2 rounded-lg text-xs font-bold border transition-all capitalize ${task.priority === p 
                                ? 'bg-white border-gray-400 text-gray-900 shadow-sm ring-1 ring-gray-200' 
                                : 'border-transparent hover:bg-gray-200 text-gray-500'}`}
                        >
                            {p === 'urgent' ? '🔥 Urgente' : p}
                        </button>
                    ))}
                 </div>
              </div>

              {/* ASSIGNEES */}
              <div className="space-y-2 pt-4 border-t border-gray-200">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Responsáveis</label>
                 <div className="flex flex-wrap gap-2">
                    {assignees.map(a => (
                        <div key={a.id} className="flex items-center gap-2 p-1.5 pr-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                             <div className="w-6 h-6 rounded-full bg-zenit-600 flex items-center justify-center text-[10px] font-bold text-zenit-950">{a.full_name.charAt(0).toUpperCase()}</div>
                             <span className="text-xs font-medium text-gray-700 truncate max-w-[80px]">{a.full_name.split(' ')[0]}</span>
                             <button onClick={() => toggleAssignee(a)} className="text-gray-400 hover:text-red-500"><X size={12}/></button>
                        </div>
                    ))}
                    <div className="relative group">
                        <button className="w-6 h-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-zenit-400 hover:text-zenit-600 bg-white"><Plus size={14}/></button>
                        {/* Dropdown for adding members */}
                        <div className="absolute top-8 left-0 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 hidden group-hover:block animate-in fade-in zoom-in-95">
                            <div className="p-2 space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase px-2 py-1">Equipe</p>
                                {teamMembers.filter(m => !assignees.find(a => a.id === m.id)).map(m => (
                                    <button key={m.id} onClick={() => toggleAssignee(m)} className="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-50 rounded flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px]">{m.full_name.charAt(0)}</div>
                                        {m.full_name}
                                    </button>
                                ))}
                                {teamMembers.length === 0 && <p className="px-2 py-2 text-xs text-gray-400 italic">Sem membros em Configurações.</p>}
                            </div>
                        </div>
                    </div>
                 </div>
              </div>

              {/* TAGS */}
              <div className="space-y-2 pt-4 border-t border-gray-200">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Etiquetas</label>
                 <div className="flex flex-wrap gap-2">
                    {tags.map(t => (
                        <span key={t} className="px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-700 border border-gray-200 flex items-center gap-1 group">
                            {t}
                            <button onClick={()=>removeTag(t)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"><X size={10}/></button>
                        </span>
                    ))}
                 </div>
                 <div className="flex items-center gap-2 mt-2">
                     <Tag size={14} className="text-gray-400"/>
                     <input 
                        className="flex-1 bg-transparent border-none text-xs focus:ring-0 placeholder:text-gray-400 p-0"
                        placeholder="Nova tag..."
                        value={newTag}
                        onChange={e => setNewTag(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                     />
                     {newTag && <button onClick={handleAddTag} className="text-xs font-bold text-zenit-600">Add</button>}
                 </div>
              </div>

              {/* DATES */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vencimento</label>
                    <input 
                        type="date" 
                        value={task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''}
                        onChange={(e) => handleFieldUpdate('due_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                        className="w-full bg-white border border-gray-200 p-2 rounded-lg text-sm font-bold text-gray-700 focus:border-zenit-400 outline-none"
                    />
                 </div>
              </div>

           </div>
           
           {!isNew && (
               <div className="mt-auto p-4 text-xs text-gray-400 border-t border-gray-200 bg-gray-100/50 text-center font-mono">
                  Criado em {new Date(task.created_at).toLocaleDateString()}
               </div>
           )}
        </div>

      </div>
    </div>
  );
};