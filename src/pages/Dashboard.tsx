import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Loader2, TrendingUp, Users, DollarSign, CheckCircle2, 
  Calendar, AlertCircle, ArrowRight, Briefcase, FileText, 
  ArrowUpRight, ArrowDownLeft, Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Task } from '../types';

interface DashboardActivity {
  id: string;
  type: 'task' | 'sale' | 'contact' | 'content';
  title: string;
  subtitle?: string;
  date: string;
  amount?: number;
  status?: string;
}

export const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [recentActivity, setRecentActivity] = useState<DashboardActivity[]>([]);
  const [financialData, setFinancialData] = useState<{month: string, income: number, expense: number}[]>([]);
  const [stats, setStats] = useState({
    activeStudents: 0,
    totalRevenue: 0,
    pendingTasks: 0,
    completionRate: 0,
    monthlyGrowth: 0
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // --- 1. TASKS & STATS ---
      const { data: allTasksData } = await supabase.from('tasks').select('*').limit(100);
      const allTasks = allTasksData || [];
      const { data: statusData } = await supabase.from('task_statuses').select('id, type');
      const doneStatusIds = statusData?.filter(s => s.type === 'done' || s.type === 'closed').map(s => s.id) || [];
      
      const myId = user?.id;
      const myTasksFiltered = allTasks.filter((t: any) => {
          const isAssigned = t.assignees && Array.isArray(t.assignees) && t.assignees.some((a: any) => a.id === myId);
          const isDone = doneStatusIds.includes(t.status_id!);
          return isAssigned && !isDone;
      }).sort((a,b) => new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime());

      // --- 2. GLOBAL ACTIVITY FEED ---
      // Buscar últimos 5 de cada tipo para mergear
      const [transRes, contactRes, contentRes, taskRes] = await Promise.all([
         supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(5),
         supabase.from('contacts').select('*').order('created_at', { ascending: false }).limit(5),
         supabase.from('content_items').select('*').order('created_at', { ascending: false }).limit(5),
         supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(5)
      ]);

      let activities: DashboardActivity[] = [];

      // Mapper Transactions
      transRes.data?.forEach((t: any) => {
          activities.push({
              id: t.id,
              type: 'sale',
              title: t.description,
              subtitle: t.type === 'income' ? 'Receita' : 'Despesa',
              date: t.created_at,
              amount: t.amount,
              status: t.type
          });
      });

      // Mapper Contacts
      contactRes.data?.forEach((c: any) => {
          activities.push({
              id: c.id,
              type: 'contact',
              title: c.full_name,
              subtitle: c.type === 'student' ? 'Novo Aluno' : 'Novo Lead',
              date: c.created_at
          });
      });

      // Mapper Content
      contentRes.data?.forEach((c: any) => {
          activities.push({
              id: c.id,
              type: 'content',
              title: c.title,
              subtitle: `Post (${c.platform})`,
              date: c.created_at,
              status: c.status
          });
      });

      // Sort and take top 8
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activities.slice(0, 8));

      // --- 3. FINANCIAL CHART DATA (Mocked Logic for Demo, Real App would use group by) ---
      // Simulando dados mensais baseados nas transações reais (ou zeros se vazio)
      const currentMonth = new Date().toLocaleString('pt-BR', { month: 'short' });
      const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleString('pt-BR', { month: 'short' });
      
      const currentIncome = transRes.data?.filter((t:any) => t.type === 'income').reduce((acc: number, c:any) => acc + c.amount, 0) || 0;
      const currentExpense = transRes.data?.filter((t:any) => t.type === 'expense').reduce((acc: number, c:any) => acc + c.amount, 0) || 0;

      setFinancialData([
        { month: 'Ant', income: currentIncome * 0.7, expense: currentExpense * 0.8 },
        { month: 'Past', income: currentIncome * 0.5, expense: currentExpense * 0.9 },
        { month: 'Pre', income: currentIncome * 0.8, expense: currentExpense * 0.6 },
        { month: lastMonth, income: currentIncome * 0.9, expense: currentExpense * 0.95 },
        { month: currentMonth, income: currentIncome, expense: currentExpense },
      ]);

      // --- 4. KPIs ---
      const { count: studentsCount } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('type', 'student').eq('status', 'active');
      const { data: incomeData } = await supabase.from('transactions').select('amount').eq('type', 'income');
      const totalRev = incomeData?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

      setMyTasks(myTasksFiltered.slice(0, 5) || []);
      setStats({
        activeStudents: studentsCount || 0,
        totalRevenue: totalRev,
        pendingTasks: myTasksFiltered.length,
        completionRate: allTasks.length > 0 ? Math.round((allTasks.filter((t:any) => doneStatusIds.includes(t.status_id)).length / allTasks.length) * 100) : 0,
        monthlyGrowth: 12 // Hardcoded for demo visualization
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

  const getActivityIcon = (type: string, status?: string) => {
      switch(type) {
          case 'sale': return status === 'income' ? <ArrowUpRight size={16} className="text-green-600"/> : <ArrowDownLeft size={16} className="text-red-600"/>;
          case 'contact': return <Users size={16} className="text-blue-600"/>;
          case 'content': return <FileText size={16} className="text-purple-600"/>;
          default: return <Activity size={16} className="text-gray-600"/>;
      }
  };

  const getActivityBg = (type: string, status?: string) => {
      switch(type) {
          case 'sale': return status === 'income' ? 'bg-green-100' : 'bg-red-100';
          case 'contact': return 'bg-blue-100';
          case 'content': return 'bg-purple-100';
          default: return 'bg-gray-100';
      }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-zenit-600" size={40} />
      </div>
    );
  }

  // Simple SVG Line Chart Component
  const SimpleLineChart = ({ data }: { data: typeof financialData }) => {
     if (data.length === 0) return null;
     const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense))) * 1.2 || 100;
     const height = 100;
     const width = 300;
     const xStep = width / (data.length - 1);
     
     const pointsIncome = data.map((d, i) => `${i * xStep},${height - (d.income / maxVal) * height}`).join(' ');
     const pointsExpense = data.map((d, i) => `${i * xStep},${height - (d.expense / maxVal) * height}`).join(' ');

     return (
         <div className="w-full h-32 relative mt-4">
             <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible preserve-3d">
                 {/* Grid Lines */}
                 <line x1="0" y1="0" x2={width} y2="0" stroke="#f3f4f6" strokeWidth="1" />
                 <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="#f3f4f6" strokeWidth="1" />
                 <line x1="0" y1={height} x2={width} y2={height} stroke="#f3f4f6" strokeWidth="1" />
                 
                 {/* Income Line */}
                 <polyline points={pointsIncome} fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                 {/* Expense Line */}
                 <polyline points={pointsExpense} fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" className="opacity-50" />
                 
                 {/* Dots */}
                 {data.map((d, i) => (
                    <g key={i}>
                        <circle cx={i * xStep} cy={height - (d.income / maxVal) * height} r="4" className="fill-green-600" />
                        {i === data.length - 1 && (
                            <text x={i * xStep} y={height - (d.income / maxVal) * height - 10} textAnchor="end" className="text-[10px] font-bold fill-green-700">R$ {d.income}</text>
                        )}
                    </g>
                 ))}
             </svg>
             <div className="flex justify-between mt-2 text-[10px] text-gray-400 font-medium uppercase">
                 {data.map((d, i) => <span key={i}>{d.month}</span>)}
             </div>
         </div>
     );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* 1. Header & Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Dashboard Geral</h1>
           <p className="text-gray-500 text-sm">Visão geral do seu ecossistema Zenit.</p>
        </div>
        <div className="flex gap-3">
           <Link to="/crm" className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-lg hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2">
             <Users size={16}/> Novo Lead
           </Link>
           <Link to="/finance" className="px-4 py-2 bg-zenit-900 text-white font-bold text-sm rounded-lg hover:bg-zenit-800 transition-colors shadow-lg flex items-center gap-2">
             <DollarSign size={16}/> Lançar Venda
           </Link>
        </div>
      </div>
      
      {/* 2. Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* Left Column: Stats & Chart (2/3 width) */}
         <div className="lg:col-span-2 space-y-6">
            
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between group hover:border-zenit-400 transition-all">
                  <div className="flex justify-between items-start">
                     <div className="p-2 bg-zenit-50 rounded-lg text-zenit-600 group-hover:bg-zenit-600 group-hover:text-zenit-950 transition-colors"><Users size={20}/></div>
                     <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <TrendingUp size={10}/> +{stats.monthlyGrowth}%
                     </span>
                  </div>
                  <div className="mt-3">
                     <h3 className="text-2xl font-bold text-gray-900">{stats.activeStudents}</h3>
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Alunos Ativos</p>
                  </div>
               </div>

               <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between group hover:border-green-400 transition-all">
                  <div className="flex justify-between items-start">
                     <div className="p-2 bg-green-50 rounded-lg text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors"><DollarSign size={20}/></div>
                  </div>
                  <div className="mt-3">
                     <h3 className="text-2xl font-bold text-gray-900 tracking-tight">R$ {stats.totalRevenue.toLocaleString('pt-BR', { notation: 'compact' })}</h3>
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Receita Total</p>
                  </div>
               </div>

               <div className="bg-zenit-900 p-5 rounded-xl border border-zenit-800 shadow-lg flex flex-col justify-between relative overflow-hidden text-white">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-zenit-600/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                  <div className="flex justify-between items-start relative z-10">
                     <div className="p-2 bg-white/10 rounded-lg text-zenit-400"><CheckCircle2 size={20}/></div>
                     <span className="text-[10px] font-bold bg-zenit-600 text-zenit-950 px-2 py-0.5 rounded-full">
                        {stats.pendingTasks} Pendentes
                     </span>
                  </div>
                  <div className="mt-3 relative z-10">
                     <h3 className="text-2xl font-bold">{stats.completionRate}%</h3>
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Taxa de Conclusão</p>
                  </div>
               </div>
            </div>

            {/* Financial Chart Section */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><DollarSign className="text-zenit-600" size={18}/> Performance Financeira</h3>
                    <div className="flex gap-4 text-xs font-bold">
                        <span className="flex items-center gap-1 text-green-700"><div className="w-2 h-2 rounded-full bg-green-600"></div> Receita</span>
                        <span className="flex items-center gap-1 text-red-700"><div className="w-2 h-2 rounded-full bg-red-600 opacity-50"></div> Despesa</span>
                    </div>
                </div>
                <SimpleLineChart data={financialData} />
            </div>

            {/* My Tasks List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
               <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2"><Briefcase className="text-zenit-600" size={18}/> Minhas Tarefas</h3>
                  <Link to="/tasks" className="text-xs font-bold text-zenit-700 hover:text-zenit-900 uppercase">Ver Todas</Link>
               </div>
               <div className="divide-y divide-gray-100">
                  {myTasks.length === 0 ? (
                      <p className="p-8 text-center text-gray-400 text-sm">Tudo limpo por aqui! 🎉</p>
                  ) : myTasks.map(task => (
                      <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                         <div className="flex items-center gap-3 overflow-hidden">
                             <div className={`w-1 h-8 rounded-full flex-shrink-0 ${task.priority==='urgent'?'bg-red-500':task.priority==='high'?'bg-orange-500':'bg-blue-500'}`}></div>
                             <div className="min-w-0">
                                <Link to={`/tasks?taskId=${task.id}`} className="font-bold text-gray-900 text-sm truncate block group-hover:text-zenit-600 transition-colors">{task.title}</Link>
                                <p className="text-xs text-gray-500 truncate">{task.context_name || 'Geral'} • <span className={`${new Date(task.due_date||'') < new Date() ? 'text-red-500' : ''}`}>{new Date(task.due_date||'').toLocaleDateString()}</span></p>
                             </div>
                         </div>
                         <Link to={`/tasks?taskId=${task.id}`} className="p-2 text-gray-300 hover:text-zenit-600 hover:bg-zenit-50 rounded-lg"><ArrowRight size={16}/></Link>
                      </div>
                  ))}
               </div>
            </div>

         </div>

         {/* Right Column: Activity Feed (1/3 width) */}
         <div className="space-y-6">
            
            {/* Welcome Widget */}
            <div className="bg-gradient-to-br from-zenit-900 to-gray-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                   <h3 className="font-bold text-lg mb-1">Olá, {user?.user_metadata?.full_name?.split(' ')[0] || 'Gestor'}!</h3>
                   <p className="text-sm text-gray-400 leading-relaxed mb-4">Você tem {stats.pendingTasks} tarefas pendentes hoje. Mantenha o foco!</p>
                   <Link to="/tasks" className="block w-full text-center py-2 bg-zenit-600 text-zenit-950 font-bold rounded-lg hover:bg-zenit-500 transition-colors text-sm">Ir para Tarefas</Link>
                </div>
            </div>

            {/* Unified Activity Feed */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[500px]">
               <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2"><Activity className="text-zenit-600" size={18}/> Feed de Atividade</h3>
                  <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded">Tempo Real</span>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {recentActivity.map((activity) => (
                      <div key={`${activity.type}-${activity.id}`} className="flex gap-3">
                          <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-white shadow-sm ${getActivityBg(activity.type, activity.status)}`}>
                                  {getActivityIcon(activity.type, activity.status)}
                              </div>
                              <div className="w-0.5 flex-1 bg-gray-100 my-1 last:hidden"></div>
                          </div>
                          <div className="pb-4">
                              <p className="text-xs text-gray-400 font-bold uppercase mb-0.5">{activity.subtitle} • {new Date(activity.date).toLocaleDateString()}</p>
                              <h4 className="text-sm font-bold text-gray-800 leading-tight">{activity.title}</h4>
                              {activity.amount && (
                                  <p className={`text-xs font-bold mt-1 ${activity.status === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                                      {activity.status === 'expense' ? '-' : '+'} R$ {activity.amount.toLocaleString('pt-BR')}
                                  </p>
                              )}
                          </div>
                      </div>
                  ))}
                  {recentActivity.length === 0 && (
                      <p className="text-center text-gray-400 text-sm py-10">Nenhuma atividade recente encontrada.</p>
                  )}
               </div>
            </div>
            
         </div>

      </div>
    </div>
  );
};