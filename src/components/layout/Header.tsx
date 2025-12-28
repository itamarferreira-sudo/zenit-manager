import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Bell, Menu, Check, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export const Header = ({ title, onMenuClick }: HeaderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Tenta pegar o nome do metadata (salvo em Settings), senão usa o email, senão "Usuário"
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const displayEmail = user?.email || '';
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Opcional: Aqui poderíamos adicionar um subscription do Supabase Realtime
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase.from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      }
    } catch (e) {
      console.error('Erro ao buscar notificações');
    }
  };

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user?.id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.read) handleMarkAsRead(n.id);
    setIsOpen(false);
    if (n.link) {
      navigate(n.link);
    }
  };

  const timeAgo = (dateStr: string) => {
     const diff = Date.now() - new Date(dateStr).getTime();
     const mins = Math.floor(diff / 60000);
     if (mins < 1) return 'Agora';
     if (mins < 60) return `${mins}m atrás`;
     const hours = Math.floor(mins / 60);
     if (hours < 24) return `${hours}h atrás`;
     return `${Math.floor(hours / 24)}d atrás`;
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
        <h2 className="text-lg md:text-xl font-semibold text-gray-800 truncate">{title}</h2>
      </div>
      
      <div className="flex items-center gap-4 md:gap-6">
        
        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
            )}
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right z-50">
               <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h4 className="font-bold text-xs uppercase text-gray-600">Notificações</h4>
                 {unreadCount > 0 && (
                   <button onClick={handleMarkAllRead} className="text-[10px] font-bold text-zenit-600 hover:underline">Marcar todas lidas</button>
                 )}
               </div>
               <div className="max-h-[300px] overflow-y-auto">
                 {notifications.length === 0 && <p className="p-4 text-center text-xs text-gray-400">Sem notificações novas.</p>}
                 {notifications.map(n => (
                   <div 
                     key={n.id} 
                     onClick={() => handleNotificationClick(n)}
                     className={`p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex gap-3 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}
                   >
                     <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.read ? 'bg-zenit-600' : 'bg-gray-300'}`}></div>
                     <div className="flex-1">
                        <p className={`text-sm ${!n.read ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 pl-4 md:pl-6 border-l border-gray-200">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-gray-700">{displayName}</p>
            <p className="text-xs text-gray-500 truncate max-w-[150px]">{displayEmail}</p>
          </div>
          <div className="w-8 h-8 md:w-9 md:h-9 bg-zenit-100 rounded-full flex items-center justify-center text-zenit-600 font-bold border border-zenit-200 text-sm shadow-sm">
            {initial}
          </div>
        </div>
      </div>
    </header>
  );
};