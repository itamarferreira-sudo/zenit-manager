import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Task, Project, TaskStatus } from '../types';
import { mockTasks, mockProjects, mockStatuses } from '../lib/mockData';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, Search, Filter, LayoutGrid, LayoutList, 
  ChevronDown, MoreHorizontal, Calendar, User, 
  CheckCircle2, Clock, Briefcase, Hash, Settings, Folder, Target, Layers, Loader2, X, Trash2, Palette
} from 'lucide-react';

export const Tasks = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTaskId = searchParams.get('taskId');

  // State
  const [activeProject, setActiveProject] = useState<string | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  
  // Selection & Modal State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isNewTaskMode, setIsNewTaskMode] = useState(false);
  
  const [loading, setLoading] = useState(true);
  
  // Project Modal State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectData, setNewProjectData] = useState({ name: '', color: '#3B82F6', description: '' });
  const [projectLoading, setProjectLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Deep Link Effect: Abre a tarefa se taskId estiver na URL e as tarefas já estiverem carregadas
  useEffect(() => {
      if (urlTaskId && tasks.length > 0 && !selectedTask) {
          const t = tasks.find(t => t.id === urlTaskId);
          if (t) {
              setSelectedTask(t);
          }
      }
  }, [urlTaskId, tasks]);

  const handleCloseModal = () => {
      setSelectedTask(null);
      // Remove o parametro da URL ao fechar sem recarregar a página
      setSearchParams(params => {
          params.delete('taskId');
          return params;
      });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Tentar buscar do Supabase
      const [projRes, statRes, taskRes] = await Promise.all([
        supabase.from('projects').select('*').order('created_at'),
        supabase.from('task_statuses').select('*').order('order_index'),
        supabase.from('tasks').select('*').order('created_at', { ascending: false })
      ]);

      if (projRes.error || statRes.error || taskRes.error) {
        console.warn('Usando dados de mock devido a erro no banco.');
        throw new Error("Fallback to mock");
      }

      setProjects(projRes.data.length > 0 ? projRes.data : []);
      setStatuses(statRes.data.length > 0 ? statRes.data : []);
      setTasks(taskRes.data);

    } catch (e) {
      setProjects(mockProjects);
      setStatuses(mockStatuses);
      setTasks(mockTasks);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newProjectData.name.trim()) return;
      setProjectLoading(true);

      try {
          const { data: projData, error: projError } = await supabase.from('projects').insert([{
              name: newProjectData.name,
              color: newProjectData.color,
              description: newProjectData.description,
              icon: 'briefcase'
          }]).select().single();

          if (projError) throw projError;

          const defaultStatuses = [
              { project_id: projData.id, name: 'A Fazer', color: '#9CA3AF', type: 'not_started', order_index: 0 },
              { project_id: projData.id, name: 'Em Andamento', color: '#3B82F6', type: 'active', order_index: 1 },
              { project_id: projData.id, name: 'Revisão', color: '#F59E0B', type: 'active', order_index: 2 },
              { project_id: projData.id, name: 'Concluído', color: '#10B981', type: 'done', order_index: 3 },
          ];

          const { data: statusData, error: statusError } = await supabase.from('task_statuses').insert(defaultStatuses).select();
          
          if (statusError) throw statusError;

          setProjects([...projects, projData]);
          setStatuses([...statuses, ...statusData]);
          setActiveProject(projData.id);
          setIsProjectModalOpen(false);
          setNewProjectData({ name: '', color: '#3B82F6', description: '' });
          alert('Projeto criado com sucesso!');

      } catch (error: any) {
          alert('Erro ao criar projeto: ' + error.message);
      } finally {
          setProjectLoading(false);
      }
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm('Tem certeza? Isso apagará todas as tarefas deste projeto.')) return;
      
      try {
          await supabase.from('tasks').delete().eq('project_id', projectId);
          await supabase.from('task_statuses').delete().eq('project_id', projectId);
          const { error } = await supabase.from('projects').delete().eq('id', projectId);
          
          if (error) throw error;

          setProjects(projects.filter(p => p.id !== projectId));
          setStatuses(statuses.filter(s => s.project_id !== projectId));
          setTasks(tasks.filter(t => t.project_id !== projectId));
          
          if (activeProject === projectId) setActiveProject('all');

      } catch (error: any) {
          alert('Erro ao excluir: ' + error.message);
      }
  };

  const handleTaskUpdate = async (updatedTask: Task) => {
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
      setSelectedTask(updatedTask); 

      try {
          const { project, status, assignees, subtasks, ...dbPayload } = updatedTask as any;
          await supabase.from('tasks').update(dbPayload).eq('id', updatedTask.id);
      } catch (err) {
          console.error('Erro ao salvar tarefa:', err);
      }
  };

  const handleOpenNewTask = () => {
      const defaultProject = activeProject !== 'all' ? activeProject : projects[0]?.id;
      const defaultStatus = statuses.find(s => s.project_id === defaultProject && s.order_index === 0)?.id;
      
      const newTaskSkeleton: Task = {
          id: 'temp-new',
          title: '',
          project_id: defaultProject,
          status_id: defaultStatus,
          priority: 'medium',
          created_at: new Date().toISOString(),
          checklists: [],
          attachments: []
      };

      setSelectedTask(newTaskSkeleton);
      setIsNewTaskMode(true);
  };

  const handleCreateTask = async (taskToCreate: Task) => {
      try {
          const { id, ...payload } = taskToCreate; 
          const { data, error } = await supabase.from('tasks').insert([payload]).select().single();
          
          if (error) throw error;
          if (data) {
              setTasks([data, ...tasks]);
              setSelectedTask(null);
              setIsNewTaskMode(false);
          }
      } catch (e: any) {
          alert('Erro ao criar tarefa: ' + e.message);
      }
  };

  const filteredTasks = activeProject === 'all' 
    ? tasks 
    : tasks.filter(t => t.project_id === activeProject);

  const displayStatuses = activeProject === 'all' 
    ? [
        { id: 'all-todo', name: 'A Fazer', color: '#9CA3AF', type: 'not_started' },
        { id: 'all-active', name: 'Em Andamento', color: '#3B82F6', type: 'active' },
        { id: 'all-done', name: 'Concluído', color: '#10B981', type: 'done' }
      ]
    : statuses.filter(s => s.project_id === activeProject).sort((a,b) => a.order_index - b.order_index);

  const getTasksForStatus = (status: any) => {
      if (activeProject !== 'all') {
          return filteredTasks.filter(t => t.status_id === status.id);
      } else {
          return filteredTasks.filter(t => {
              const originalStatus = statuses.find(s => s.id === t.status_id);
              return originalStatus?.type === status.type;
          });
      }
  };

  const getStatusColor = (sId: string | undefined) => statuses.find(s => s.id === sId)?.color || '#e5e7eb';

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="animate-spin text-zenit-600" size={40} />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-4 md:-m-8 bg-white">
      
      {/* 1. PROJECT SIDEBAR */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col shrink-0">
         <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider flex items-center gap-2"><Layers size={14}/> Workspaces</h3>
            <button onClick={() => setIsProjectModalOpen(true)} className="text-gray-400 hover:text-zenit-600 hover:bg-zenit-50 p-1 rounded transition-colors"><Plus size={16}/></button>
         </div>
         
         <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <button 
              onClick={() => setActiveProject('all')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeProject === 'all' ? 'bg-white shadow-sm text-zenit-950 ring-1 ring-gray-200' : 'text-gray-600 hover:bg-gray-100'}`}
            >
               <LayoutGrid size={16} className={activeProject === 'all' ? 'text-zenit-600' : 'text-gray-400'}/>
               Todos os Projetos
            </button>
            
            <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex justify-between items-center">
                <span>Meus Projetos</span>
            </div>
            
            {projects.map(proj => (
               <button 
                 key={proj.id}
                 onClick={() => setActiveProject(proj.id)}
                 className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group relative ${activeProject === proj.id ? 'bg-white shadow-sm text-gray-900 ring-1 ring-gray-200' : 'text-gray-600 hover:bg-gray-100'}`}
               >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{backgroundColor: proj.color}}></span>
                  <span className="truncate flex-1 text-left">{proj.name}</span>
                  <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex items-center bg-gray-100 rounded shadow-sm">
                      <Trash2 size={12} className="text-red-400 hover:text-red-600 p-0.5 cursor-pointer" onClick={(e) => handleDeleteProject(proj.id, e)}/>
                  </div>
               </button>
            ))}
         </div>
      </div>

      {/* 2. MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
         
         {/* Toolbar */}
         <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 shrink-0 bg-white z-10">
            <div className="flex items-center gap-4">
               <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <span className="w-3 h-8 rounded-full bg-zenit-600 block"></span>
                  {activeProject === 'all' ? 'Todas as Tarefas' : projects.find(p => p.id === activeProject)?.name}
               </h2>
               <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                  <button onClick={()=>setViewMode('list')} className={`p-1.5 rounded ${viewMode==='list'?'bg-white shadow-sm text-gray-900':'text-gray-400 hover:text-gray-600'}`} title="Lista"><LayoutList size={18}/></button>
                  <button onClick={()=>setViewMode('kanban')} className={`p-1.5 rounded ${viewMode==='kanban'?'bg-white shadow-sm text-gray-900':'text-gray-400 hover:text-gray-600'}`} title="Kanban"><LayoutGrid size={18}/></button>
               </div>
            </div>

            <div className="flex items-center gap-3">
               <div className="relative group">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-zenit-600 transition-colors"/>
                  <input className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-zenit-600 outline-none w-64 transition-all" placeholder="Buscar tarefas..." />
               </div>
               {projects.length > 0 && (
                 <button onClick={handleOpenNewTask} className="bg-zenit-600 text-zenit-950 px-4 py-2 rounded-lg font-bold shadow-md hover:bg-zenit-500 flex items-center gap-2 transition-all transform hover:-translate-y-0.5">
                    <Plus size={18}/> Nova Tarefa
                 </button>
               )}
            </div>
         </div>

         {/* Content View */}
         <div className="flex-1 overflow-hidden bg-gray-50/50 relative">
            {viewMode === 'kanban' && (
               <div className="h-full overflow-x-auto p-6">
                  <div className="flex gap-6 h-full min-w-max">
                     {displayStatuses.map((status: any) => {
                        const statusTasks = getTasksForStatus(status);
                        return (
                            <div key={status.id} className="w-80 flex flex-col h-full">
                               <div className="flex items-center justify-between mb-4 px-1 sticky top-0 bg-transparent z-10">
                                  <div className="flex items-center gap-2">
                                     <div className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm" style={{backgroundColor: status.color}}></div>
                                     <span className="font-bold text-gray-700 text-sm uppercase tracking-wide">{status.name}</span>
                                     <span className="bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full text-xs font-bold shadow-sm">{statusTasks.length}</span>
                                  </div>
                                  <button onClick={() => { setSelectedTask({ id: 'temp', title: '', project_id: status.project_id || (projects[0]?.id), status_id: status.id, priority: 'medium', created_at: new Date().toISOString() }); setIsNewTaskMode(true); }} className="text-gray-400 hover:text-gray-800 hover:bg-white p-1 rounded transition-colors"><Plus size={16}/></button>
                               </div>
                               <div className="flex-1 overflow-y-auto space-y-3 pb-10 custom-scrollbar pr-2">
                                  {statusTasks.map(task => (
                                     <div 
                                        key={task.id} 
                                        onClick={() => { setSelectedTask(task); setIsNewTaskMode(false); }}
                                        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-hover cursor-pointer group transition-all relative border-l-4"
                                        style={{borderLeftColor: status.color}}
                                     >
                                        <div className="flex justify-between items-start mb-2">
                                           <span className="text-[10px] text-gray-400 font-mono group-hover:text-zenit-600 transition-colors">{task.custom_id}</span>
                                           {task.priority === 'urgent' && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Urgente"></span>}
                                        </div>
                                        <h4 className="font-bold text-gray-800 text-sm mb-3 leading-snug group-hover:text-black transition-colors">{task.title}</h4>
                                        <div className="flex items-center justify-between mt-4 border-t border-gray-50 pt-3">
                                           <div className="flex -space-x-2">
                                              {task.assignees?.map((a, i) => (
                                                 <div key={i} className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[8px] font-bold text-gray-600" title={a.full_name}>{a.full_name.charAt(0)}</div>
                                              ))}
                                              {(!task.assignees || task.assignees.length === 0) && <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400"><User size={10}/></div>}
                                           </div>
                                        </div>
                                     </div>
                                  ))}
                               </div>
                            </div>
                        );
                     })}
                  </div>
               </div>
            )}
            {viewMode === 'list' && (
               <div className="h-full overflow-auto p-6 custom-scrollbar">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-w-[1000px]">
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                              <th className="px-4 py-3 w-12 text-center"><Hash size={14}/></th>
                              <th className="px-4 py-3">Tarefa</th>
                              <th className="px-4 py-3 w-40">Status</th>
                              <th className="px-4 py-3 w-40">Responsáveis</th>
                              <th className="px-4 py-3 w-32">Vencimento</th>
                              <th className="px-4 py-3 w-32">Prioridade</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                           {filteredTasks.map(task => (
                              <tr key={task.id} onClick={() => { setSelectedTask(task); setIsNewTaskMode(false); }} className="hover:bg-gray-50 cursor-pointer group transition-colors">
                                 <td className="px-4 py-3 text-xs text-gray-400 font-mono text-center">{task.custom_id}</td>
                                 <td className="px-4 py-3">
                                    <div className="font-bold text-gray-800 text-sm group-hover:text-zenit-600">{task.title}</div>
                                 </td>
                                 <td className="px-4 py-3">
                                    <span className="px-2 py-1 rounded text-xs font-bold text-white shadow-sm" style={{backgroundColor: getStatusColor(task.status_id)}}>{statuses.find(s=>s.id===task.status_id)?.name}</span>
                                 </td>
                                 <td className="px-4 py-3">
                                    <div className="flex -space-x-2">
                                       {task.assignees?.map((a, i) => (
                                          <div key={i} className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-600">{a.full_name.charAt(0)}</div>
                                       ))}
                                    </div>
                                 </td>
                                 <td className="px-4 py-3 text-sm text-gray-600 font-medium">{task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}</td>
                                 <td className="px-4 py-3"><div className="flex items-center gap-2 text-sm font-medium text-gray-700 capitalize"><span className={`w-2 h-2 rounded-full ${task.priority === 'urgent' ? 'bg-red-500' : 'bg-gray-400'}`}></span>{task.priority || 'Normal'}</div></td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            )}
         </div>
      </div>

      {selectedTask && (
         <TaskDetailModal 
            task={selectedTask} 
            isOpen={!!selectedTask} 
            onClose={handleCloseModal}
            onUpdate={handleTaskUpdate}
            onCreate={handleCreateTask}
            isNew={isNewTaskMode}
            projects={projects}
            statuses={statuses}
         />
      )}

      {isProjectModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200">
                  <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-gray-900">Novo Workspace / Projeto</h3>
                      <button onClick={()=>setIsProjectModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleCreateProject} className="p-6 space-y-4">
                      <div><label className="text-sm font-bold text-gray-700 mb-1 block">Nome do Projeto</label><input required autoFocus className="w-full p-3 border border-gray-300 rounded-lg text-gray-900" placeholder="Ex: Marketing Digital" value={newProjectData.name} onChange={e=>setNewProjectData({...newProjectData, name: e.target.value})}/></div>
                      <div>
                          <label className="text-sm font-bold text-gray-700 mb-1 block">Cor</label>
                          <div className="flex gap-2 flex-wrap">
                              {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'].map(color => (
                                  <button type="button" key={color} onClick={()=>setNewProjectData({...newProjectData, color})} className={`w-8 h-8 rounded-full border-2 transition-all ${newProjectData.color === color ? 'border-gray-600 scale-110 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'}`} style={{backgroundColor: color}}></button>
                              ))}
                          </div>
                      </div>
                      <div className="pt-2 flex justify-end gap-3">
                          <button type="button" onClick={()=>setIsProjectModalOpen(false)} className="px-4 py-2 text-gray-600 font-bold text-sm hover:bg-gray-100 rounded-lg">Cancelar</button>
                          <button disabled={projectLoading} className="px-6 py-2 bg-zenit-600 text-zenit-950 rounded-lg font-bold text-sm shadow-md hover:bg-zenit-500 flex items-center gap-2">
                              {projectLoading ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>} Criar Projeto
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};