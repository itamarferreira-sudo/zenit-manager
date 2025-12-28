import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Loader2, TrendingUp, Users, DollarSign, CheckCircle2, Calendar, AlertCircle, ArrowRight, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Task, Contact } from '../types';

export const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Dashboard State
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState({
    activeStudents: 0,
    totalRevenue: 0,
    pendingTasks: 0,
    completionRate: 0
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch ALL Tasks to calculate stats
      // Note: In a real large app, we would use Supabase .count() or specific RPC calls for stats to avoid fetching all rows.
      const { data: allTasksData } = await supabase.from('tasks')
        .select('*')
        .order('priority', { ascending: false })
        .limit(100);

      const allTasks = allTasksData || [];

      // 2. Fetch Statuses to know what is "done"
      const { data: statusData } = await supabase.from('task_statuses').select('id, type');
      const doneStatusIds = statusData?.filter(s => s.type === 'done' || s.type === 'closed').map(s => s.id) || [];
      
      // Calculate Global Stats
      const completedCount = allTasks.filter(t => doneStatusIds.includes(t.status_id!)).length;
      const totalTasksCount = allTasks.length;
      const completionRate = totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : 0;

      // 3. Filter MY Tasks (Client-side filtering of JSONB assignees array)
      // This looks for tasks where assignees array contains an object with the current user's ID
      const myId = user?.id;
      const myTasksFiltered = allTasks.filter((t: any) => {
          const isAssigned = t.assignees && Array.isArray(t.assignees) && t.assignees.some((a: any) => a.id === myId);
          const isDone = doneStatusIds.includes(t.status_id!);
          return isAssigned && !isDone;
      });

      // 4. Fetch Other Stats
      const { count: studentsCount } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('type', 'student').eq('status', 'active');
      const { data: incomeData } = await supabase.from('transactions').select('amount').eq('type', 'income');
      const totalRev = incomeData?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

      setMyTasks(myTasksFiltered.slice(0, 10) || []);
      setStats({
        activeStudents: studentsCount || 0,
        totalRevenue: totalRev,
        pendingTasks: myTasksFiltered.length, // Only count MY pending tasks for the welcome message
        completionRate
      });

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (p: string) => {
    switch(p) {
        case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
        case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
        case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200';
        default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-zenit-600" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Welcome Banner */}
      <div className="bg-zenit-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-zenit-600/10 skew-x-12 transform origin-bottom-right"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Olá, {user?.user_metadata?.full_name?.split(' ')[0] || 'Gestor'}! 👋</h2>
          <p className="text-gray-400 max-w-xl">
            Aqui está o resumo operacional de hoje. Você tem <strong className="text-zenit-600">{stats.pendingTasks} tarefas pendentes</strong> atribuídas diretamente a você.
          </p>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/zenit" className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-zenit-600 transition-all group">
          <div className="flex justify-between items-start mb-2">
            <div className="p-3 bg-zenit-50 text-zenit-900 rounded-lg group-hover:bg-zenit-600 group-hover:text-zenit-950 transition-colors">
              <Users size={24} />
            </div>
            <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">Ativos</span>
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Alunos Zenit</p>
          <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.activeStudents}</h3>
        </Link>

        <Link to="/finance" className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-green-500 transition-all group">
          <div className="flex justify-between items-start mb-2">
             <div className="p-3 bg-green-50 text-green-700 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
              <DollarSign size={24} />
            </div>
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Receita Total</p>
          <h3 className="text-3xl font-bold text-gray-900 mt-1">R$ {stats.totalRevenue.toLocaleString('pt-BR', { notation: 'compact' })}</h3>
        </Link>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
           <div className="flex justify-between items-start mb-2">
             <div className="p-3 bg-blue-50 text-blue-700 rounded-lg">
              <CheckCircle2 size={24} />
            </div>
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Taxa de Conclusão Global</p>
          <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.completionRate}%</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* MAIN: My Tasks */}
        <div className="lg:col-span-2 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm min-h-[500px]">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="text-zenit-600" size={20}/> Minhas Tarefas Prioritárias
            </h3>
            <Link to="/tasks" className="text-xs font-bold text-zenit-700 hover:text-zenit-900 flex items-center gap-1 uppercase tracking-wide">
              Ver Todas <ArrowRight size={14} />
            </Link>
          </div>
          
          <div className="flex-1 overflow-auto p-2">
            {myTasks.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400"><CheckCircle2 size={32}/></div>
                  <h4 className="font-bold text-gray-900">Tudo em dia!</h4>
                  <p className="text-gray-500 text-sm mt-1">Você não tem tarefas pendentes atribuídas.</p>
               </div>
            ) : (
              <div className="space-y-2">
                {myTasks.map(task => (
                  <Link to={`/tasks?taskId=${task.id}`} key={task.id} className="block group p-4 rounded-xl border border-gray-100 hover:border-zenit-600 hover:bg-zenit-50/10 hover:shadow-md transition-all cursor-pointer bg-white relative overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${task.priority === 'urgent' ? 'bg-red-500' : task.priority === 'high' ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                    <div className="flex justify-between items-start pl-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${getPriorityColor(task.priority || 'low')}`}>
                            {task.priority === 'urgent' ? 'Urgente' : task.priority}
                          </span>
                          {task.context_name && (
                             <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200 font-bold flex items-center gap-1">
                               <Briefcase size={10}/> {task.context_name}
                             </span>
                          )}
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm">{task.title}</h4>
                        {task.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description}</p>}
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-bold flex items-center justify-end gap-1 ${task.due_date && new Date(task.due_date) < new Date() ? 'text-red-600' : 'text-gray-400'}`}>
                          <Calendar size={12}/> {task.due_date ? new Date(task.due_date).toLocaleDateString().slice(0,5) : 'S/ data'}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SIDE: Quick Actions / Recent Activity */}
        <div className="flex flex-col gap-6">
          <div className="bg-gradient-to-br from-zenit-900 to-zenit-800 rounded-xl p-6 text-white shadow-lg">
             <h3 className="font-bold mb-4 flex items-center gap-2"><Briefcase size={18}/> Atalhos Rápidos</h3>
             <div className="space-y-3">
                <Link to="/crm" className="block w-full bg-white/10 hover:bg-white/20 p-3 rounded-lg text-sm font-bold transition-colors flex items-center gap-3">
                   <Users size={16} className="text-zenit-600"/> Novo Cadastro
                </Link>
                <Link to="/finance" className="block w-full bg-white/10 hover:bg-white/20 p-3 rounded-lg text-sm font-bold transition-colors flex items-center gap-3">
                   <DollarSign size={16} className="text-green-400"/> Lançar Venda
                </Link>
                <Link to="/content" className="block w-full bg-white/10 hover:bg-white/20 p-3 rounded-lg text-sm font-bold transition-colors flex items-center gap-3">
                   <Calendar size={16} className="text-purple-400"/> Agendar Post
                </Link>
             </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 p-6">
             <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">Avisos do Sistema</h3>
             <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100 flex gap-3">
               <AlertCircle className="text-yellow-600 shrink-0" size={20}/>
               <div>
                 <p className="text-sm font-bold text-yellow-800">Fechamento Mensal</p>
                 <p className="text-xs text-yellow-700 mt-1">Lembre-se de atualizar as métricas dos alunos Zenit até o dia 05.</p>
               </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};