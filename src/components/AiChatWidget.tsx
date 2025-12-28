import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useAuth } from '../contexts/AuthContext';
import { Bot, X, Send, Sparkles, Loader2, MessageSquare } from 'lucide-react';

export const AiChatWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key missing");

      // Montar contexto do Knowledge Base
      let context = '';
      const kb = user?.user_metadata?.ai_knowledge_base;
      if (Array.isArray(kb) && kb.length > 0) {
        context = kb.map((item: any) => `[FONTE: ${item.source}]: ${item.content}`).join('\n\n');
      } else {
        context = "Não há base de conhecimento específica carregada. Responda com conhecimentos gerais de negócios.";
      }

      const systemPrompt = `
        Você é o assistente inteligente da Zenit Manager.
        Sua função é ajudar a equipe com base no seguinte CONTEXTO DA EMPRESA:
        
        ${context}
        
        Se a resposta não estiver no contexto, use seu conhecimento geral mas avise que não encontrou na base interna.
        Seja direto, útil e profissional.
      `;

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMsg,
        config: {
            systemInstruction: systemPrompt
        }
      });

      const text = response.text || "Desculpe, não consegui processar a resposta.";
      setMessages(prev => [...prev, { role: 'model', text: text }]);

    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Erro ao conectar com o cérebro da empresa." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all hover:scale-105 flex items-center gap-2 font-bold ${isOpen ? 'hidden' : 'bg-zenit-900 text-white border-2 border-zenit-600'}`}
      >
        <Sparkles size={20} className="text-zenit-600" />
        <span className="hidden md:inline">Zenit AI</span>
      </button>

      {/* Chat Interface */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col h-[500px] animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="p-4 bg-zenit-900 text-white rounded-t-2xl flex justify-between items-center shadow-md">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-zenit-600 rounded-lg text-zenit-950">
                 <Bot size={20} />
               </div>
               <div>
                 <h3 className="font-bold text-sm">Zenit Brain</h3>
                 <p className="text-xs text-gray-400">Tire dúvidas sobre a empresa</p>
               </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center py-10 opacity-50">
                <Sparkles size={40} className="mx-auto mb-2 text-zenit-600"/>
                <p className="text-sm font-bold text-gray-600">Olá! Como posso ajudar hoje?</p>
                <p className="text-xs text-gray-400 mt-1">Pergunte sobre processos, aulas ou conteúdo.</p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-zenit-600 text-zenit-950 rounded-br-none font-medium' 
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-xl border border-gray-200 rounded-bl-none flex items-center gap-2 text-xs font-bold text-gray-500">
                  <Loader2 className="animate-spin" size={14} /> Pensando...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-200 rounded-b-2xl">
            <div className="relative flex items-center">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Pergunte algo ao cérebro..."
                className="w-full pl-4 pr-12 py-3 bg-gray-100 border-transparent focus:bg-white border focus:border-zenit-600 rounded-xl text-sm outline-none transition-all"
              />
              <button 
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="absolute right-2 p-2 bg-zenit-900 text-white rounded-lg hover:bg-zenit-800 disabled:opacity-50 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};