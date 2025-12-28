import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Outlet, useLocation } from 'react-router-dom';
import { AiChatWidget } from '../AiChatWidget';

const getTitle = (path: string) => {
  switch (path) {
    case '/': return 'Dashboard Geral';
    case '/crm': return 'CRM & Cadastros';
    case '/zenit': return 'Gestão Alunos Zenit';
    case '/content': return 'Hub de Conteúdo';
    case '/finance': return 'Gestão Financeira';
    case '/settings': return 'Configurações do Sistema';
    default: return 'Zenit Manager';
  }
};

export const Layout = () => {
  const location = useLocation();
  const title = getTitle(location.pathname);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar Overlay para Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <Sidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      <div className="flex-1 md:ml-64 flex flex-col min-w-0 transition-all duration-300 relative">
        <Header 
          title={title} 
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
        
        {/* Floating AI Widget */}
        <AiChatWidget />
      </div>
    </div>
  );
};