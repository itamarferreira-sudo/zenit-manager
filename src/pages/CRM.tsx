import React, { useEffect, useState } from 'react';
import { supabase, uploadFile } from '../lib/supabase';
import { Contact, ContactType, Transaction, SystemTag } from '../types';
import { TagSelector } from '../components/TagSelector';
import { Plus, Search, Pencil, X, DollarSign, Tag, CreditCard, ToggleLeft, ToggleRight, Paperclip, File, Loader2, ExternalLink } from 'lucide-react';

export const CRM = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<SystemTag[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<ContactType | 'all'>('all');
  
  // Modal & Tabs
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'financial'>('info');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactTransactions, setContactTransactions] = useState<Transaction[]>([]);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '', email: '', phone: '', document: '', city: '', age: '',
    instagram: '', product_name: '', purchase_date: '',
    address: '', notes: '', type: 'lead' as ContactType, status: 'active',
    attachments: [] as string[],
    // Finance Automation Fields
    auto_finance: false,
    finance_value: '',
    finance_recurrence: false
  });

  const [newTrans, setNewTrans] = useState({ description: '', amount: '', due_date: '', recurrence: false });

  useEffect(() => { 
      fetchContacts(); 
      fetchTags();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar contatos:', JSON.stringify(error, null, 2));
      // Não alertar para não interromper fluxo, apenas logar
    }
  };

  const fetchTags = async () => {
      try {
        const { data, error } = await supabase.from('system_tags').select('*').eq('type', 'product');
        if (error) throw error;
        setTags(data || []);
      } catch (error: any) {
        console.error('Erro ao buscar etiquetas de produto:', JSON.stringify(error, null, 2));
      }
  };

  const fetchContactTransactions = async (contactId: string) => {
      try {
        const { data, error } = await supabase.from('transactions').select('*').eq('contact_id', contactId).order('due_date', { ascending: false });
        if (error) throw error;
        setContactTransactions(data || []);
      } catch (error: any) {
        console.error('Erro transações do contato:', JSON.stringify(error, null, 2));
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
        const publicUrl = await uploadFile(file, 'crm');
        setFormData(prev => ({ ...prev, attachments: [...prev.attachments, publicUrl] }));
        alert('Arquivo anexado! Clique em Salvar para persistir.');
    } catch (error: any) {
        alert('Erro no upload: ' + error.message);
    } finally {
        setUploading(false);
    }
 };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { 
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          document: formData.document,
          city: formData.city,
          age: formData.age,
          instagram: formData.instagram,
          product_name: formData.product_name,
          notes: formData.notes,
          type: formData.type,
          status: formData.status,
          attachments: formData.attachments,
          purchase_date: formData.purchase_date ? new Date(formData.purchase_date).toISOString() : null 
      };

      let savedContactId = editingContact?.id;

      if (editingContact) {
        const { error } = await supabase.from('contacts').update(payload).eq('id', editingContact.id);
        if (error) throw error;
        setContacts(contacts.map(c => c.id === editingContact.id ? { ...c, ...payload } : c));
        alert('Dados atualizados!');
      } else {
        const { data, error } = await supabase.from('contacts').insert([payload]).select().single();
        if (error) throw error;
        if (data) {
           setContacts([data, ...contacts]);
           savedContactId = data.id;
        }
      }

      // Finance Automation
      if (formData.auto_finance && savedContactId && formData.finance_value) {
         const transPayload = {
            description: `Venda - ${formData.full_name}`,
            amount: parseFloat(formData.finance_value),
            type: 'income',
            status: 'pending',
            category: 'Vendas',
            contact_id: savedContactId,
            due_date: formData.purchase_date ? new Date(formData.purchase_date).toISOString() : new Date().toISOString()
         };
         
         const { error: transError } = await supabase.from('transactions').insert([transPayload]);
         if(transError) {
             console.error('Erro ao gerar fatura automática:', JSON.stringify(transError));
             alert('Contato salvo, mas erro ao gerar fatura: ' + transError.message);
         } else {
             alert('✅ Cliente salvo e Fatura gerada no Financeiro!');
         }
      } else if (!editingContact) {
          alert('✅ Cadastro realizado com sucesso!');
      }

      setIsModalOpen(false);
    } catch (e: any) { 
        console.error(JSON.stringify(e, null, 2));
        alert('Erro ao salvar contato: ' + (e.message || e.toString())); 
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!editingContact) return;

      const payload = {
          description: newTrans.description,
          amount: parseFloat(newTrans.amount),
          due_date: new Date(newTrans.due_date).toISOString(),
          type: 'income',
          status: 'pending',
          category: 'Vendas',
          contact_id: editingContact.id
      };

      const { data, error } = await supabase.from('transactions').insert([payload]).select().single();
      if (error) {
          alert('Erro ao gerar cobrança: ' + error.message);
          return;
      }
      if(data) {
          setContactTransactions([data, ...contactTransactions]);
          setNewTrans({ description: '', amount: '', due_date: '', recurrence: false });
          alert('Fatura gerada com sucesso!');
      }
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setActiveTab('info');
    setFormData({
      full_name: contact.full_name, email: contact.email||'', phone: contact.phone||'', 
      document: contact.document||'', city: contact.city||'', age: contact.age||'',
      instagram: contact.instagram||'', product_name: contact.product_name||'', 
      purchase_date: contact.purchase_date ? contact.purchase_date.split('T')[0] : '',
      address: contact.address||'', notes: contact.notes||'', type: contact.type, status: contact.status,
      attachments: contact.attachments || [],
      auto_finance: false, finance_value: '', finance_recurrence: false
    });
    fetchContactTransactions(contact.id);
    setIsModalOpen(true);
  };

  const filtered = contacts.filter(c => (filterType === 'all' || c.type === filterType) && c.full_name.toLowerCase().includes(searchTerm.toLowerCase()));

  const getProductColor = (prodName: string) => {
      const tag = tags.find(t => t.label === prodName);
      return tag ? tag.color : '#E5E7EB';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 overflow-x-auto">{['all', 'lead', 'student', 'client'].map(t => (
           <button key={t} onClick={()=>setFilterType(t as any)} className={`px-4 py-2 rounded-lg text-sm capitalize font-bold transition-colors ${filterType===t?'bg-zenit-600 text-zenit-950 shadow-md':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>{t}</button>
        ))}</div>
        <div className="flex gap-2">
           <input className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-zenit-600 outline-none" placeholder="Buscar..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
           <button onClick={()=>{setEditingContact(null); setFormData({full_name:'', email:'', phone:'', document:'', city:'', age:'', instagram:'', product_name:'', purchase_date:'', address:'', notes:'', type:'lead', status:'active', attachments:[], auto_finance:false, finance_value:'', finance_recurrence:false}); setIsModalOpen(true)}} className="bg-zenit-600 text-zenit-950 px-4 py-2 rounded-lg flex items-center gap-2 font-bold hover:bg-zenit-500 shadow-md"><Plus size={18}/> Novo</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
         <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-600 uppercase font-bold text-left border-b border-gray-200"><tr><th className="px-6 py-4">Nome</th><th className="px-6 py-4">Contato</th><th className="px-6 py-4">Perfil</th><th className="px-6 py-4">Produto</th><th className="px-6 py-4 text-right">Ações</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
               {filtered.map(c => (
                 <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4"><div className="font-bold text-gray-900">{c.full_name}</div><div className="text-xs text-gray-500 font-medium">{c.city} • {c.age ? `${c.age} anos` : ''}</div></td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium"><div>{c.email}</div><div>{c.phone}</div></td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs capitalize font-bold ${c.type==='student'?'bg-purple-100 text-purple-700':'bg-gray-100 text-gray-700'}`}>{c.type}</span></td>
                    <td className="px-6 py-4">
                        {c.product_name && (
                            <span className="px-2 py-1 rounded text-xs text-white font-bold shadow-sm" style={{ backgroundColor: getProductColor(c.product_name) }}>
                                {c.product_name}
                            </span>
                        )}
                    </td>
                    <td className="px-6 py-4 text-right"><button onClick={()=>openEditModal(c)} className="p-2 text-gray-400 hover:text-zenit-600 hover:bg-zenit-50 rounded"><Pencil size={16}/></button></td>
                 </tr>
               ))}
               {filtered.length === 0 && (
                 <tr><td colSpan={5} className="text-center py-8 text-gray-500">Nenhum contato encontrado.</td></tr>
               )}
            </tbody>
         </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-2xl w-full max-w-4xl shadow-modal h-[90vh] flex flex-col overflow-hidden border border-gray-200">
              <div className="p-6 bg-zenit-900 text-white flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="font-bold text-xl">{editingContact ? editingContact.full_name : 'Novo Cadastro'}</h3>
                    <p className="text-sm text-gray-400">Gerenciamento completo do Lead/Cliente</p>
                  </div>
                  <button onClick={()=>setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
              </div>

              {editingContact && (
                  <div className="flex border-b border-gray-200 bg-gray-50 shrink-0">
                      <button onClick={()=>setActiveTab('info')} className={`flex-1 py-3.5 font-bold text-sm border-b-2 transition-colors ${activeTab==='info'?'border-zenit-600 text-zenit-900 bg-white':'border-transparent text-gray-500 hover:text-gray-700'}`}>Dados Cadastrais</button>
                      <button onClick={()=>setActiveTab('financial')} className={`flex-1 py-3.5 font-bold text-sm border-b-2 flex items-center justify-center gap-2 transition-colors ${activeTab==='financial'?'border-green-600 text-green-700 bg-white':'border-transparent text-gray-500 hover:text-gray-700'}`}><DollarSign size={16}/> Financeiro do Lead</button>
                  </div>
              )}

              <div className="flex-1 overflow-y-auto p-8 bg-white">
                 {(activeTab === 'info' || !editingContact) && (
                    <form onSubmit={handleSaveContact} className="space-y-6">
                        <div className="space-y-4">
                            <h4 className="font-bold text-gray-800 border-b border-gray-200 pb-2">Dados Pessoais</h4>
                            <div className="grid grid-cols-2 gap-5">
                                <div><label className="text-sm font-bold text-gray-700 mb-1 block">Nome Completo</label><input required className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-zenit-600 outline-none" value={formData.full_name} onChange={e=>setFormData({...formData, full_name: e.target.value})} /></div>
                                <div><label className="text-sm font-bold text-gray-700 mb-1 block">CPF/CNPJ</label><input className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-900" value={formData.document} onChange={e=>setFormData({...formData, document: e.target.value})} /></div>
                                <div><label className="text-sm font-bold text-gray-700 mb-1 block">Email</label><input type="email" className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-900" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} /></div>
                                <div><label className="text-sm font-bold text-gray-700 mb-1 block">Telefone</label><input className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-900" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} /></div>
                                <div><label className="text-sm font-bold text-gray-700 mb-1 block">Cidade/UF</label><input className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-900" value={formData.city} onChange={e=>setFormData({...formData, city: e.target.value})} /></div>
                                <div><label className="text-sm font-bold text-gray-700 mb-1 block">Idade</label><input className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-900" value={formData.age} onChange={e=>setFormData({...formData, age: e.target.value})} /></div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-bold text-gray-800 border-b border-gray-200 pb-2">Dados Comerciais</h4>
                            <div className="grid grid-cols-2 gap-5">
                                <div><label className="text-sm font-bold text-gray-700 mb-1 block">Tipo</label><select className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white" value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value as any})}><option value="lead">Lead</option><option value="student">Aluno</option><option value="client">Cliente</option></select></div>
                                <div>
                                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1 mb-1"><Tag size={14}/> Produto (Etiqueta)</label>
                                    <TagSelector type="product" value={formData.product_name || ''} onChange={(val) => setFormData({...formData, product_name: val})} />
                                </div>
                                <div><label className="text-sm font-bold text-gray-700 mb-1 block">Instagram</label><input className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-900" value={formData.instagram} onChange={e=>setFormData({...formData, instagram: e.target.value})} /></div>
                                <div><label className="text-sm font-bold text-gray-700 mb-1 block">Data Compra</label><input type="date" className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-900" value={formData.purchase_date} onChange={e=>setFormData({...formData, purchase_date: e.target.value})} /></div>
                            </div>
                        </div>

                        <div><label className="text-sm font-bold text-gray-700 mb-1 block">Observações</label><textarea className="w-full p-3 border border-gray-300 rounded-lg h-24 text-gray-900 resize-none" value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})} /></div>
                        
                        {/* Attachments Section */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                           <h4 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2"><Paperclip size={14}/> Arquivos e Prints</h4>
                           <div className="flex flex-wrap gap-2 mb-3">
                              {formData.attachments?.map((url, idx) => (
                                 <a key={idx} href={url} target="_blank" className="bg-white border border-gray-300 rounded px-2 py-1 text-xs font-bold text-gray-600 hover:text-zenit-600 hover:border-zenit-600 flex items-center gap-1">
                                    <File size={12}/> Arquivo {idx+1} <ExternalLink size={10}/>
                                 </a>
                              ))}
                           </div>
                           <label className={`cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded text-xs font-bold text-gray-600 hover:bg-gray-100 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                               {uploading ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
                               {uploading ? 'Enviando...' : 'Adicionar Anexo'}
                               <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading}/>
                           </label>
                        </div>

                        {/* Auto Finance Generation */}
                        {!editingContact && (
                           <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-bold text-green-800 flex items-center gap-2"><DollarSign size={16}/> Automação Financeira</h4>
                                <button type="button" onClick={()=>setFormData({...formData, auto_finance: !formData.auto_finance})} className="text-green-700">
                                   {formData.auto_finance ? <ToggleRight size={28} className="text-green-600"/> : <ToggleLeft size={28} className="text-gray-400"/>}
                                </button>
                              </div>
                              {formData.auto_finance && (
                                <div className="grid grid-cols-2 gap-4 mt-3 animate-in fade-in">
                                   <div><label className="text-xs font-bold text-green-700 uppercase">Valor Venda (R$)</label><input type="number" step="0.01" className="w-full p-2 border border-green-300 rounded" value={formData.finance_value} onChange={e=>setFormData({...formData, finance_value: e.target.value})}/></div>
                                   <div><label className="text-xs font-bold text-green-700 uppercase">É recorrente?</label><select className="w-full p-2 border border-green-300 rounded bg-white" value={formData.finance_recurrence ? 'sim' : 'nao'} onChange={e=>setFormData({...formData, finance_recurrence: e.target.value === 'sim'})}><option value="nao">Pagamento Único</option><option value="sim">Assinatura Mensal</option></select></div>
                                </div>
                              )}
                           </div>
                        )}
                        
                        <div className="flex justify-end pt-4"><button className="bg-zenit-600 text-zenit-950 px-8 py-2.5 rounded-lg hover:bg-zenit-500 font-bold shadow-md transition-all">Salvar Dados</button></div>
                    </form>
                 )}

                 {activeTab === 'financial' && (
                     <div className="space-y-8 animate-in fade-in">
                         <div className="bg-green-50 p-6 rounded-xl border border-green-200 shadow-sm">
                             <h4 className="font-bold text-green-800 mb-4 flex items-center gap-2 text-lg"><Plus size={20}/> Nova Fatura para este Lead</h4>
                             <form onSubmit={handleAddTransaction} className="grid grid-cols-4 gap-4 items-end">
                                 <div className="col-span-2"><label className="text-xs font-bold text-green-800 uppercase mb-1 block">Descrição / Produto</label><input required className="w-full p-2.5 border border-green-200 rounded text-sm text-gray-800 focus:ring-2 focus:ring-green-500 outline-none" value={newTrans.description} onChange={e=>setNewTrans({...newTrans, description: e.target.value})} placeholder="Ex: Mensalidade Zenit" /></div>
                                 <div><label className="text-xs font-bold text-green-800 uppercase mb-1 block">Valor (R$)</label><input required type="number" step="0.01" className="w-full p-2.5 border border-green-200 rounded text-sm text-gray-800 focus:ring-2 focus:ring-green-500 outline-none" value={newTrans.amount} onChange={e=>setNewTrans({...newTrans, amount: e.target.value})} /></div>
                                 <div><label className="text-xs font-bold text-green-800 uppercase mb-1 block">Vencimento</label><input required type="date" className="w-full p-2.5 border border-green-200 rounded text-sm text-gray-800 focus:ring-2 focus:ring-green-500 outline-none" value={newTrans.due_date} onChange={e=>setNewTrans({...newTrans, due_date: e.target.value})} /></div>
                                 <button className="col-span-4 mt-2 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-500 shadow-md w-full transition-all">Gerar Cobrança</button>
                             </form>
                         </div>

                         <div>
                             <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-lg"><CreditCard size={20}/> Histórico Financeiro</h4>
                             <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                 <table className="w-full">
                                     <thead className="bg-gray-100 text-xs font-bold text-gray-600 uppercase border-b border-gray-200"><tr><th className="px-6 py-3 text-left">Descrição</th><th className="px-6 py-3 text-center">Vencimento</th><th className="px-6 py-3 text-center">Status</th><th className="px-6 py-3 text-right">Valor</th></tr></thead>
                                     <tbody className="divide-y divide-gray-100">
                                         {contactTransactions.map(t => (
                                             <tr key={t.id} className="bg-white hover:bg-gray-50">
                                                 <td className="px-6 py-4 text-sm font-bold text-gray-900">{t.description}</td>
                                                 <td className="px-6 py-4 text-center text-sm text-gray-700 font-medium">{new Date(t.due_date).toLocaleDateString()}</td>
                                                 <td className="px-6 py-4 text-center"><span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${t.status==='paid'?'bg-green-100 text-green-700 border border-green-200':'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>{t.status === 'paid' ? 'PAGO' : 'PENDENTE'}</span></td>
                                                 <td className="px-6 py-4 text-right text-sm font-bold text-green-600">R$ {t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                             </tr>
                                         ))}
                                         {contactTransactions.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400 text-sm font-medium">Nenhuma fatura lançada para este contato.</td></tr>}
                                     </tbody>
                                 </table>
                             </div>
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