import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { Login } from './src/pages/Login';
import { Layout } from './src/components/layout/Layout';
import { Dashboard } from './src/pages/Dashboard';
import { CRM } from './src/pages/CRM';
import { Zenit } from './src/pages/Zenit';
import { Content } from './src/pages/Content';
import { Finance } from './src/pages/Finance';
import { Settings } from './src/pages/Settings';
import { Tasks } from './src/pages/Tasks';
import { Loader2 } from 'lucide-react';

// Componente para proteger rotas privadas
const PrivateRoute = ({ children }: React.PropsWithChildren) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-zenit-600" size={40} />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="crm" element={<CRM />} />
            <Route path="zenit" element={<Zenit />} />
            <Route path="content" element={<Content />} />
            <Route path="finance" element={<Finance />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);