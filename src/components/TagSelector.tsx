import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { SystemTag } from '../types';
import { Plus, MoreHorizontal, X, Check, Trash2, Edit2, Palette } from 'lucide-react';

interface TagSelectorProps {
  type: 'product' | 'cost_center' | 'niche';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const TagSelector = ({ type, value, onChange, placeholder = "Selecione...", className }: TagSelectorProps) => {
  const [tags, setTags] = useState<SystemTag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Create/Edit State
  const [editingTag, setEditingTag] = useState<SystemTag | null>(null);
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagColor, setNewTagColor] = useState('#4f46e5');
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTags();
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setView('list');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTags = async () => {
    const { data, error } = await supabase.from('system_tags').select('*').eq('type', type).order('label');
    if (error) {
        console.error('Erro ao buscar etiquetas:', error);
        return;
    }
    setTags(data || []);
  };

  const handleCreate = async () => {
    if (!newTagLabel.trim()) return;
    setLoading(true);
    
    try {
        const { data, error } = await supabase.from('system_tags').insert([{
          label: newTagLabel,
          color: newTagColor,
          type: type
        }]).select().single();
        
        if (error) throw error;
        
        if (data) {
          setTags([...tags, data]);
          onChange(data.label);
          setView('list');
          setNewTagLabel('');
        }
    } catch (error: any) {
        console.error('Erro ao criar etiqueta:', error);
        alert(`Erro ao criar etiqueta: ${error.message || 'Verifique se a tabela system_tags existe.'}`);
    } finally {
        setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingTag || !newTagLabel.trim()) return;
    setLoading(true);
    const { error } = await supabase.from('system_tags').update({
      label: newTagLabel,
      color: newTagColor
    }).eq('id', editingTag.id);

    if (!error) {
      setTags(tags.map(t => t.id === editingTag.id ? { ...t, label: newTagLabel, color: newTagColor } : t));
      if (value === editingTag.label) onChange(newTagLabel);
      setView('list');
      setEditingTag(null);
    } else {
        alert('Erro ao atualizar: ' + error.message);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta etiqueta?')) return;
    const { error } = await supabase.from('system_tags').delete().eq('id', id);
    if (error) {
        alert('Erro ao excluir: ' + error.message);
        return;
    }
    setTags(tags.filter(t => t.id !== id));
    if (tags.find(t => t.id === id)?.label === value) onChange('');
    setView('list');
  };

  const startEdit = (tag: SystemTag, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTag(tag);
    setNewTagLabel(tag.label);
    setNewTagColor(tag.color);
    setView('edit');
  };

  const selectedTag = tags.find(t => t.label === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full p-2 border border-gray-300 rounded-lg cursor-pointer bg-white flex items-center justify-between min-h-[42px] hover:border-zenit-600 transition-colors"
      >
        {value ? (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: selectedTag?.color || '#ccc' }} />
            <span className="text-sm font-medium text-gray-800">{value}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">{placeholder}</span>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          
          {/* LIST VIEW */}
          {view === 'list' && (
            <>
              <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
                {tags.map(tag => (
                  <div 
                    key={tag.id} 
                    onClick={() => { onChange(tag.label); setIsOpen(false); }}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-sm ${value === tag.label ? 'bg-zenit-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                       <span className="text-gray-700 font-medium">{tag.label}</span>
                    </div>
                    <button 
                      onClick={(e) => startEdit(tag, e)}
                      className="p-1 text-gray-300 hover:text-zenit-600 hover:bg-zenit-100 rounded-md transition-colors"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                ))}
                {tags.length === 0 && <p className="text-xs text-center text-gray-400 py-3">Nenhuma etiqueta.</p>}
              </div>
              <div 
                onClick={() => { setView('create'); setNewTagLabel(''); setNewTagColor('#4f46e5'); }}
                className="border-t border-gray-100 p-2 cursor-pointer bg-gray-50 hover:bg-gray-100 flex items-center justify-center gap-2 text-sm text-zenit-600 font-bold"
              >
                <Plus size={16} /> Criar "{type === 'cost_center' ? 'C. Custo' : type}"
              </div>
            </>
          )}

          {/* CREATE / EDIT VIEW */}
          {(view === 'create' || view === 'edit') && (
            <div className="p-3 bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase">{view === 'create' ? 'Nova Etiqueta' : 'Editar Etiqueta'}</span>
                {view === 'edit' && (
                  <button onClick={() => handleDelete(editingTag!.id)} className="text-red-500 hover:bg-red-100 p-1 rounded"><Trash2 size={14}/></button>
                )}
              </div>
              
              <input 
                autoFocus
                className="w-full p-2 text-sm border rounded mb-2 text-gray-800"
                placeholder="Nome da etiqueta..."
                value={newTagLabel}
                onChange={e => setNewTagLabel(e.target.value)}
              />
              
              <div className="flex items-center gap-2 mb-3">
                 <label className="text-xs font-bold text-gray-600">Cor:</label>
                 <div className="flex gap-1">
                    {['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b'].map(c => (
                       <div 
                         key={c} 
                         onClick={() => setNewTagColor(c)}
                         className={`w-5 h-5 rounded-full cursor-pointer border-2 ${newTagColor === c ? 'border-gray-600 scale-110' : 'border-transparent'}`}
                         style={{ backgroundColor: c }}
                       />
                    ))}
                    <input type="color" className="w-6 h-6 p-0 border-0 rounded-full overflow-hidden" value={newTagColor} onChange={e=>setNewTagColor(e.target.value)} />
                 </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => { setView('list'); setEditingTag(null); }}
                  className="flex-1 py-1.5 text-xs font-bold text-gray-600 bg-white border rounded hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={view === 'create' ? handleCreate : handleUpdate}
                  disabled={loading}
                  className="flex-1 py-1.5 text-xs font-bold text-white bg-zenit-600 rounded hover:bg-zenit-500 flex items-center justify-center gap-1"
                >
                  {loading ? '...' : <Check size={14}/>} Salvar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};