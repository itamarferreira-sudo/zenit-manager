import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Contact, StudentMetric, Task } from '../types';
import { TagSelector } from '../components/TagSelector';
import { 
  GraduationCap, TrendingUp, Users, Search, ChevronRight, 
  User, MapPin, X, DollarSign, Briefcase, Target, 
  BarChart2, Plus, Save, ExternalLink, CheckSquare, Calendar, Trash2, ListChecks
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Zenit = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [selectedStudent, setSelectedStudent] = useState<Contact | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'metrics' | 'tasks'>('info');
  
  // Sub-data states
  const [metrics, setMetrics] = useState<StudentMetric[]>([]);
  const [studentTasks, setStudentTasks] = useState<Task[]>([]);
  
  // Forms States
  const [newMetric, setNewMetric] = useState({
    month_year: new Date().toLocaleDateString('pt-BR', {month: '2-digit', year: 'numeric'}),
    sales_count: 0,
    meetings_booked: 0,
    meetings_executed: 0,
    revenue_generated: 0
  });

  // Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  // Editing State
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState<Partial<Contact>>({});

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase.from('contacts')
        .select('*')
        .eq('type', 'student')
        .order('full_name', { ascending: true });
        
      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) { 
      console.error('Erro buscar alunos:', JSON.stringify(error, null, 2)); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleOpenStudent = async (student: Contact) => {
    setSelectedStudent(student);
    setEditedData(student);
    setActiveTab('info');
    setEditMode(false);
    
    // Fetch Metrics
    const { data: mData } = await supabase.from('student_metrics')
      .select('*')
      .eq('contact_id', student.id)
      .order('created_at', { ascending: false });
    setMetrics(mData || []);

    // Fetch Tasks
    fetchStudentTasks(student.id);
  };

  const fetchStudentTasks = async (studentId: string) => {
    const { data: tData } = await supabase.from('tasks')
      .select('*')
      .eq('contact_id', studentId)
      .order('due_date', { ascending: true });
    setStudentTasks(tData || []);
  };

  const handleSaveInfo = async () => {
      if(!selectedStudent) return;
      const { error } = await supabase.from('contacts').update(editedData).eq('id', selectedStudent.id);
      if(!error) {
          setSelectedStudent({...selectedStudent, ...editedData} as Contact);
          fetchStudents();
          setEditMode(false);
      }
  };

  const handleAddMetric = async () => {
    if (!selectedStudent) return;
    try {
      const { data, error } = await supabase.from('student_metrics').insert([{
        contact_id: selectedStudent.id,
        ...newMetric
      }]).select().single();
      
      if (error) throw error;
      setMetrics([data, ...metrics]);
      
      const newLTV = (selectedStudent.ltv || 0) + parseFloat(newMetric.revenue_generated.toString());
      await supabase.from('contacts').update({ ltv: newLTV }).eq('id', selectedStudent.id);
      setSelectedStudent({ ...selectedStudent, ltv: newLTV });
    } catch (e) { alert('Erro ao adicionar métrica'); }
  };

  const handleAddTask = async () => {
    if (!selectedStudent || !newTaskTitle.trim()) return;
    
    // Simplificação: Assume um projeto/status padrão ou deixa null para ser preenchido
    const newTask = {
        title: newTaskTitle,
        contact_id: selectedStudent.id,
        // project_id: '...', // Opcional: Definir um projeto padrão se necessário
        priority: newTaskPriority,
        due_date: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : null,
        created_at: new Date().toISOString(),
        context_type: 'aluno_zenit' as const,
        context_name: selectedStudent.full_name
    };
    
    const { data, error } = await supabase.from('tasks').insert([newTask]).select().single();
    if(data && !error) {
        setStudentTasks([...studentTasks, data]);
        setNewTaskTitle('');
        setNewTaskPriority('medium');
        setNewTaskDueDate('');
    }
  };

  const handleAddOnboardingTemplate = async () => {
      if(!selectedStudent) return;
      if(!confirm('Adicionar checklist padrão de Onboarding para este aluno?')) return;

      const templateTasks = [
          { title: 'Enviar acesso à plataforma', priority: 'high', due_date: new Date().toISOString() },
          { title: 'Agendar Call de Boas-vindas', priority: 'high', due_date: new Date(Date.now() + 86400000).toISOString() },
          { title: 'Adicionar ao grupo de WhatsApp', priority: 'medium', due_date: new Date().toISOString() },
          { title: 'Criar pasta no Drive', priority: 'low', due_date: new Date().toISOString() },
      ];

      const tasksToInsert = templateTasks.map(t => ({
          ...t,
          contact_id: selectedStudent.id,
          priority: t.priority as any,
          created_at: new Date().toISOString(),
          context_type: 'aluno_zenit' as const,
          context_name: selectedStudent.full_name
      }));

      const { data, error } = await supabase.from('tasks').insert(tasksToInsert).select();
      if(data && !error) {
          setStudentTasks([...studentTasks, ...data]);
      }
  };

  const deleteTask = async (taskId: string) => {
     if(!confirm('Excluir tarefa?')) return;
     await supabase.from('tasks').delete().eq('id', taskId);
     setStudentTasks(studentTasks.filter(t => t.id !== taskId));
  };

  const filteredStudents = students.filter(student => 
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group">
           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Users size={48} className="text-zenit-600"/></div>
           <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Alunos Ativos</p>
           <h3 className="text-3xl font-bold text-gray-900 mt-1">{students.filter(s => s.status === 'active').length}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group">
           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingUp size={48} className="text-green-600"/></div>
           <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Faturamento (Alunos)</p>
           <h3 className="text-3xl font-bold text-green-600 mt-1">
             R$ {students.reduce((acc, curr) => acc + (curr.ltv || 0), 0).toLocaleString('pt-BR', { notation: 'compact' })}
           </h3>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-[600px]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900"><GraduationCap className="text-zenit-600"/> Gestão de Alunos Zenit</h2>
            <p className="text-sm text-gray-500 mt-1">Acompanhamento individual de performance</p>
          </div>
          <div className="relative w-72">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
             <input className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-zenit-600 outline-none text-gray-900 bg-white" placeholder="Buscar aluno..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-600 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left">Aluno</th>
                <th className="px-6 py-4 text-left">Nicho / Produto</th>
                <th className="px-6 py-4 text-left">LTV (Vendas)</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.map(s => (
                <tr key={s.id} onClick={() => handleOpenStudent(s)} className="hover:bg-gray-50 cursor-pointer transition-colors group">
                  <td className="px-6 py-4 flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-zenit-100 flex items-center justify-center text-zenit-950 font-bold border border-zenit-200">{s.full_name.charAt(0)}</div>
                     <div><p className="font-bold text-gray-900">{s.full_name}</p><p className="text-xs text-gray-500 font-medium">{s.email}</p></div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="text-sm text-gray-900 font-medium">{s.niche || 'N/D'}</div>
                     <div className="text-xs text-gray-500">{s.product_name}</div>
                  </td>
                  <td className="px-6 py-4 font-bold text-green-600">R$ {(s.ltv || 0).toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4 text-center"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${s.status === 'active' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>{s.status}</span></td>
                  <td className="px-6 py-4 text-right"><ChevronRight size={20} className="text-gray-300 group-hover:text-zenit-600 transition-colors"/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* STUDENT DETAIL MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in-95">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl h-[90vh] flex flex-col overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="p-6 bg-zenit-900 text-white flex justify-between items-start shrink-0">
              <div className="flex items-center gap-5">
                 <div className="w-20 h-20 bg-zenit-600 rounded-2xl flex items-center justify-center text-3xl font-bold border-4 border-zenit-950 shadow-lg text-zenit-950">{selectedStudent.full_name.charAt(0)}</div>
                 <div>
                   <h2 className="text-2xl font-bold text-white">{selectedStudent.full_name}</h2>
                   <div className="flex items-center gap-4 mt-2 text-gray-300 text-sm">
                     <span className="flex items-center gap-1"><Briefcase size={14}/> {selectedStudent.niche || 'Sem nicho'}</span>
                     <span className="flex items-center gap-1"><Target size={14}/> {selectedStudent.acquisition_channel || 'Canal N/D'}</span>
                     <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs border border-green-500/30 font-bold">Total Vendido: R$ {(selectedStudent.ltv || 0).toLocaleString('pt-BR')}</span>
                   </div>
                 </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"><X size={24}/></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50 shrink-0">
               <button onClick={() => setActiveTab('info')} className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'info' ? 'border-zenit-600 text-zenit-950 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><User size={18}/> Dados Cadastrais</button>
               <button onClick={() => setActiveTab('tasks')} className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'tasks' ? 'border-zenit-600 text-zenit-950 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><CheckSquare size={18}/> Tarefas & Checklist</button>
               <button onClick={() => setActiveTab('metrics')} className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'metrics' ? 'border-zenit-600 text-zenit-950 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><BarChart2 size={18}/> Histórico & Métricas</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
              
              {/* TAB: INFO */}
              {activeTab === 'info' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
                     <div className="flex justify-between items-center border-b pb-3 mb-2 border-gray-100">
                        <h3 className="font-bold text-gray-800">Informações Pessoais</h3>
                        <button onClick={()=> editMode ? handleSaveInfo() : setEditMode(true)} className="text-xs text-zenit-600 font-bold hover:underline bg-zenit-50 px-2 py-1 rounded">{editMode ? 'SALVAR ALTERAÇÕES' : 'EDITAR DADOS'}</button>
                     </div>
                     <div className="grid grid-cols-2 gap-5">
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Email</label><p className="font-medium text-gray-900 mt-1">{selectedStudent.email}</p></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Telefone</label><p className="font-medium text-gray-900 mt-1">{selectedStudent.phone}</p></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">CPF/CNPJ</label><p className="font-medium text-gray-900 mt-1">{selectedStudent.document || '-'}</p></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Idade</label><p className="font-medium text-gray-900 mt-1">{selectedStudent.age || '-'}</p></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Cidade</label><p className="font-medium text-gray-900 mt-1">{selectedStudent.city || '-'}</p></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Instagram</label><a href={`https://instagram.com/${selectedStudent.instagram?.replace('@','')}`} target="_blank" className="font-medium text-blue-600 flex items-center gap-1 mt-1">{selectedStudent.instagram} <ExternalLink size={12}/></a></div>
                     </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
                     <h3 className="font-bold text-gray-800 border-b pb-3 mb-2 border-gray-100">Dados do Negócio</h3>
                     <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Nicho de Atuação</label>
                            {editMode ? (
                                <TagSelector type="niche" value={editedData.niche || ''} onChange={val => setEditedData({...editedData, niche: val})} />
                            ) : (
                                <p className="font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-100">{selectedStudent.niche || '-'}</p>
                            )}
                        </div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Produto</label><p className="font-medium text-gray-900 mt-1">{selectedStudent.product_name || 'Zenit Mentoria'}</p></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Data Compra</label><p className="font-medium text-gray-900 mt-1">{selectedStudent.purchase_date ? new Date(selectedStudent.purchase_date).toLocaleDateString() : '-'}</p></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Observações</label><p className="bg-yellow-50 p-3 rounded text-sm text-gray-800 mt-1 min-h-[80px] border border-yellow-100 leading-relaxed">{selectedStudent.notes || 'Sem observações.'}</p></div>
                     </div>
                  </div>
                </div>
              )}

              {/* TAB: TASKS */}
              {activeTab === 'tasks' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><ListChecks size={20} className="text-zenit-600"/> Checklist & Tarefas</h3>
                            <button onClick={handleAddOnboardingTemplate} className="text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1.5 rounded border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1">
                                <Plus size={14}/> Carregar Onboarding Padrão
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-12 gap-2 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 items-end">
                            <div className="col-span-12 md:col-span-6">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nova Tarefa</label>
                                <input 
                                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white" 
                                  placeholder="Descreva a tarefa..."
                                  value={newTaskTitle}
                                  onChange={e => setNewTaskTitle(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                                />
                            </div>
                            <div className="col-span-6 md:col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Prazo</label>
                                <input 
                                  type="date"
                                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white" 
                                  value={newTaskDueDate}
                                  onChange={e => setNewTaskDueDate(e.target.value)}
                                />
                            </div>
                            <div className="col-span-6 md:col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Prioridade</label>
                                <select 
                                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                                  value={newTaskPriority}
                                  onChange={e => setNewTaskPriority(e.target.value as any)}
                                >
                                    <option value="low">Baixa</option>
                                    <option value="medium">Média</option>
                                    <option value="high">Alta</option>
                                    <option value="urgent">Urgente</option>
                                </select>
                            </div>
                            <div className="col-span-12 md:col-span-2">
                                <button onClick={handleAddTask} className="w-full bg-zenit-600 text-zenit-950 h-[42px] font-bold rounded-lg hover:bg-zenit-500 text-sm shadow-sm">Adicionar</button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {studentTasks.map(task => (
                                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border transition-all bg-white border-gray-200 hover:border-zenit-400">
                                    <div className="flex items-center gap-3">
                                        <div className="text-gray-900 font-medium text-sm">
                                            {task.title}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {task.due_date && (
                                            <span className={`text-xs font-bold flex items-center gap-1 ${(task.status as any) !== 'done' && new Date(task.due_date) < new Date() ? 'text-red-600' : 'text-gray-400'}`}>
                                                <Calendar size={12}/> {new Date(task.due_date).toLocaleDateString().slice(0,5)}
                                            </span>
                                        )}
                                        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold border ${
                                            task.priority==='urgent'?'text-red-600 bg-red-50 border-red-100':
                                            task.priority==='high'?'text-orange-600 bg-orange-50 border-orange-100':
                                            task.priority==='medium'?'text-blue-600 bg-blue-50 border-blue-100':
                                            'text-gray-500 bg-gray-50 border-gray-200'
                                        }`}>
                                            {task.priority === 'urgent' ? 'Urgente' : task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                                        </span>
                                        <button onClick={()=>deleteTask(task.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            ))}
                            {studentTasks.length === 0 && (
                                <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-lg">
                                    <ListChecks size={32} className="mx-auto text-gray-300 mb-2"/>
                                    <p className="text-gray-400 text-sm">Nenhuma tarefa pendente para este aluno.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
              )}

              {/* TAB: METRICS */}
              {activeTab === 'metrics' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                   <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Plus size={18} className="text-zenit-600"/> Adicionar Fechamento Mensal</h3>
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
                         <div className="col-span-1"><label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Mês/Ano</label><input type="text" value={newMetric.month_year} onChange={e=>setNewMetric({...newMetric, month_year: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white" placeholder="MM/AAAA"/></div>
                         <div><label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Agendadas</label><input type="number" value={newMetric.meetings_booked} onChange={e=>setNewMetric({...newMetric, meetings_booked: parseInt(e.target.value)})} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"/></div>
                         <div><label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Executadas</label><input type="number" value={newMetric.meetings_executed} onChange={e=>setNewMetric({...newMetric, meetings_executed: parseInt(e.target.value)})} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"/></div>
                         <div><label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Vendas</label><input type="number" value={newMetric.sales_count} onChange={e=>setNewMetric({...newMetric, sales_count: parseInt(e.target.value)})} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"/></div>
                         <div className="col-span-2 md:col-span-1"><label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Faturamento (R$)</label><input type="number" value={newMetric.revenue_generated} onChange={e=>setNewMetric({...newMetric, revenue_generated: parseFloat(e.target.value)})} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"/></div>
                         <button onClick={handleAddMetric} className="bg-zenit-600 text-zenit-950 p-2.5 rounded-lg hover:bg-zenit-500 font-bold text-sm flex justify-center items-center gap-1 shadow-sm transition-colors"><Save size={16}/> Lançar</button>
                      </div>
                   </div>

                   <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <table className="w-full">
                         <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-600 border-b border-gray-200">
                           <tr><th className="px-6 py-3 text-left">Mês</th><th className="px-6 py-3 text-center">Agendadas</th><th className="px-6 py-3 text-center">Executadas</th><th className="px-6 py-3 text-center">Vendas</th><th className="px-6 py-3 text-right">Faturamento</th></tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                           {metrics.map(m => (
                             <tr key={m.id} className="hover:bg-gray-50">
                               <td className="px-6 py-4 font-bold text-gray-900">{m.month_year}</td>
                               <td className="px-6 py-4 text-center text-gray-700 font-medium">{m.meetings_booked}</td>
                               <td className="px-6 py-4 text-center text-gray-700 font-medium">{m.meetings_executed}</td>
                               <td className="px-6 py-4 text-center text-gray-700 font-medium">{m.sales_count}</td>
                               <td className="px-6 py-4 text-right text-green-600 font-bold">R$ {m.revenue_generated.toLocaleString('pt-BR')}</td>
                             </tr>
                           ))}
                           {metrics.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-gray-400">Nenhum histórico lançado.</td></tr>}
                         </tbody>
                         {metrics.length > 0 && (
                           <tfoot className="bg-gray-100/50 font-bold text-gray-900 border-t border-gray-200">
                             <tr>
                               <td className="px-6 py-4">TOTAL</td>
                               <td className="px-6 py-4 text-center">{metrics.reduce((a,b)=>a+b.meetings_booked,0)}</td>
                               <td className="px-6 py-4 text-center">{metrics.reduce((a,b)=>a+b.meetings_executed,0)}</td>
                               <td className="px-6 py-4 text-center">{metrics.reduce((a,b)=>a+b.sales_count,0)}</td>
                               <td className="px-6 py-4 text-right text-green-700">R$ {metrics.reduce((a,b)=>a+b.revenue_generated,0).toLocaleString('pt-BR')}</td>
                             </tr>
                           </tfoot>
                         )}
                      </table>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};