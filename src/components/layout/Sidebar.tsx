import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  FileText, 
  DollarSign, 
  Settings, 
  LogOut,
  X,
  CheckSquare
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const location = useLocation();
  const { signOut } = useAuth();
  
  const isActive = (path: string) => location.pathname === path;

  // New Menu Structure
  const menuItems = [
    { path: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/tasks', icon: <CheckSquare size={20} />, label: 'Tarefas' }, // New Module
    { path: '/crm', icon: <Users size={20} />, label: 'CRM Cadastro' },
    { path: '/zenit', icon: <GraduationCap size={20} />, label: 'CRM Zenit' },
    { path: '/content', icon: <FileText size={20} />, label: 'Conteúdo' },
    { path: '/finance', icon: <DollarSign size={20} />, label: 'Financeiro' },
  ];

  return (
    <>
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-zenit-900 text-white shadow-2xl transform transition-transform duration-300 ease-in-out border-r border-zenit-800
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:h-screen md:flex md:flex-col
      `}>
        {/* Logo Area */}
        <div className="p-6 border-b border-zenit-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zenit-600 rounded-lg flex items-center justify-center font-bold text-xl text-zenit-950 shadow-lg shadow-zenit-600/30">
              Z
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-wider text-white">ZENIT</h1>
              <p className="text-xs text-gray-400 font-medium">Workspace</p>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => onClose()}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium ${
                isActive(item.path)
                  ? 'bg-zenit-600 text-zenit-950 shadow-md translate-x-1'
                  : 'text-gray-400 hover:bg-zenit-800 hover:text-white'
              }`}
            >
              <span className={`${isActive(item.path) ? 'text-zenit-950' : 'text-gray-400 group-hover:text-white'}`}>
                {item.icon}
              </span>
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Bottom Area */}
        <div className="p-4 border-t border-zenit-800 space-y-1 bg-zenit-950/50">
          <Link
              to="/settings"
              onClick={() => onClose()}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-gray-400 hover:bg-zenit-800 hover:text-white`}
            >
              <Settings size={18} />
              <span className="font-medium text-sm">Configurações</span>
          </Link>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-red-400 hover:bg-red-900/20 hover:text-red-300"
          >
            <LogOut size={18} />
            <span className="font-medium text-sm">Sair</span>
          </button>
        </div>
      </div>
    </>
  );
};