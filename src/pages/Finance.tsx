import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction, TransactionType, SystemTag } from '../types';
import { TagSelector } from '../components/TagSelector';
import { DollarSign, TrendingUp, Plus, ArrowUpRight, ArrowDownLeft, Trash2, X } from 'lucide-react';

export const Finance = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tags, setTags] = useState<SystemTag[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    description: '', amount: '', type: 'expense' as TransactionType, category: '', due_date: new Date().toISOString().split('T')[0], status: 'pending'
  });

  useEffect(() => { fetchTransactions(); fetchTags(); }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase.from('transactions').select('*').order('due_date', { ascending: false });
      if (error) throw error;
      setTransactions(data || []);
    } catch (e: any) {
      console.error('Erro ao buscar transações:', JSON.stringify(e, null, 2));
    }
  };

  const fetchTags = async () => {
      try {
        const { data, error } = await supabase.from('system_tags').select('*').eq('type', 'cost_center');
        if (error) throw error;
        setTags(data || []);
      } catch (e: any) {
        console.error('Erro ao buscar centros de custo:', JSON.stringify(e, null, 2));
      }
  };

  const handleOpenModal = (t?: Transaction) => {
    if (t) {
      setEditingId(t.id);
      setFormData({
        description: t.description, amount: t.amount.toString(), type: t.type, category: t.category, due_date: t.due_date.split('T')[0], status: t.status as any
      });
    } else {
      setEditingId(null);
      setFormData({ description: '', amount: '', type: 'expense', category: '', due_date: new Date().toISOString().split('T')[0], status: 'pending' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, amount: parseFloat(formData.amount) };
    try {
      if (editingId) {
        const { error } = await supabase.from('transactions').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('transactions').insert([payload]);
        if (error) throw error;
      }
      fetchTransactions();
      setIsModalOpen(false);
    } catch (e: any) { 
        console.error(JSON.stringify(e, null, 2));
        alert('Erro ao salvar transação: ' + e.message); 
    }
  };

  const toggleStatus = async (t: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = t.status === 'paid' ? 'pending' : 'paid';
    const { error } = await supabase.from('transactions').update({ status: newStatus }).eq('id', t.id);
    if (error) alert('Erro ao atualizar status: ' + error.message);
    else fetchTransactions();
  };

  const deleteTransaction = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Excluir?')) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) alert('Erro ao excluir: ' + error.message);
    else fetchTransactions();
  };

  const income = transactions.filter(t => t.type === 'income').reduce((acc, c) => acc + c.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((acc, c) => acc + c.amount, 0);

  const getCatColor = (catName: string) => {
     const tag = tags.find(t => t.label === catName);
     return tag ? tag.color : '#9ca3af';
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"><p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Receita Total</p><h3 className="text-3xl font-bold text-green-600 mt-2">R$ {income.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3></div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"><p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Despesas</p><h3 className="text-3xl font-bold text-red-600 mt-2">R$ {expense.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3></div>
        <div className="bg-zenit-900 p-6 rounded-xl border border-zenit-800 shadow-xl text-white"><p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Saldo em Caixa</p><h3 className="text-3xl font-bold mt-2">R$ {(income - expense).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3></div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-[500px]">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/30">
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900"><DollarSign className="text-zenit-600"/> Transações</h2>
          <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-5 py-2.5 bg-zenit-600 text-zenit-950 rounded-lg shadow-md hover:bg-zenit-500 font-bold text-sm transition-all"><Plus size={18}/> Novo Lançamento</button>
        </div>

        <div className="flex-1 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-600 border-b border-gray-200"><tr><th className="px-6 py-4 text-left">Descrição</th><th className="px-6 py-4 text-left">Centro de Custo</th><th className="px-6 py-4 text-left">Vencimento</th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4 text-right">Valor</th><th className="px-6 py-4 text-center">Ações</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map(t => (
                <tr key={t.id} onClick={() => handleOpenModal(t)} className="hover:bg-gray-50 cursor-pointer group transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3"><div className={`p-1.5 rounded-lg ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{t.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}</div>{t.description}</td>
                  <td className="px-6 py-4">
                      {t.category && <span className="px-2.5 py-1 rounded-md text-xs text-white font-bold shadow-sm uppercase tracking-wide" style={{backgroundColor: getCatColor(t.category)}}>{t.category}</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm font-medium">{new Date(t.due_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-center"><button onClick={(e) => toggleStatus(t, e)} className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors uppercase ${t.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'}`}>{t.status === 'paid' ? 'PAGO' : 'PENDENTE'}</button></td>
                  <td className={`px-6 py-4 text-right font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'expense' && '- '}R$ {t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                  <td className="px-6 py-4 text-center"><button onClick={(e) => deleteTransaction(t.id, e)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center"><h3 className="font-bold text-lg text-gray-900">{editingId ? 'Editar Lançamento' : 'Novo Lançamento'}</h3><button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button></div>
            <form onSubmit={handleSave} className="p-8 space-y-5">
               <div className="flex gap-4">
                 <button type="button" onClick={()=>setFormData({...formData, type: 'expense'})} className={`flex-1 py-3 rounded-lg border font-bold text-sm transition-all ${formData.type === 'expense' ? 'bg-red-50 border-red-500 text-red-700 shadow-sm' : 'border-gray-300 text-gray-500 hover:bg-gray-50'}`}>DESPESA</button>
                 <button type="button" onClick={()=>setFormData({...formData, type: 'income'})} className={`flex-1 py-3 rounded-lg border font-bold text-sm transition-all ${formData.type === 'income' ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' : 'border-gray-300 text-gray-500 hover:bg-gray-50'}`}>RECEITA</button>
               </div>
               <div><label className="text-sm font-bold text-gray-700 mb-1 block">Descrição</label><input required className="w-full p-3 border border-gray-300 rounded-lg text-gray-900" value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} /></div>
               <div className="grid grid-cols-2 gap-5">
                 <div><label className="text-sm font-bold text-gray-700 mb-1 block">Valor</label><input type="number" step="0.01" required className="w-full p-3 border border-gray-300 rounded-lg text-gray-900" value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})} /></div>
                 <div><label className="text-sm font-bold text-gray-700 mb-1 block">Vencimento</label><input type="date" required className="w-full p-3 border border-gray-300 rounded-lg text-gray-900" value={formData.due_date} onChange={e=>setFormData({...formData, due_date: e.target.value})} /></div>
               </div>
               <div>
                   <label className="text-sm font-bold text-gray-700 mb-1 block">Centro de Custo (Etiqueta)</label>
                   <TagSelector type="cost_center" value={formData.category} onChange={(val) => setFormData({...formData, category: val})} placeholder="Selecione o centro de custo..." />
               </div>
               <div className="pt-4 flex justify-end gap-3"><button type="button" onClick={()=>setIsModalOpen(false)} className="px-5 py-2.5 text-gray-600 font-bold text-sm hover:bg-gray-100 rounded-lg">Cancelar</button><button type="submit" className="px-8 py-2.5 bg-zenit-600 text-zenit-950 rounded-lg font-bold text-sm shadow-md hover:bg-zenit-500">Salvar</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};