'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import ChatBubble from '@/components/Chat/ChatBubble';
import MessageInput from '@/components/Chat/MessageInput';

export type Role = 'user' | 'ia' | 'expert';

export interface Message {
  id: string;
  role: Role;
  content: string;
  isImage?: boolean;
  isEstimate?: boolean;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ia',
      content: "Bonjour ! Je suis l'assistant virtuel des Artistes Rénov. Décrivez-moi votre projet ou votre problème de rénovation (ex: plomberie, électricité, peinture...) ou envoyez une photo."
    }
  ]);
  const [isExpertMode, setIsExpertMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const toggleExpertMode = () => {
    setIsExpertMode(!isExpertMode);
    if (!isExpertMode) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'expert',
          content: "Bonjour, je suis l'expert en rénovation de l'équipe. Je prends le relais. Souhaitez-vous générer un devis ou voulez-vous plus de détails sur nos méthodes d'intervention ?"
        }]);
      }, 1500);
    }
  };

  const handleSendMessage = async (text: string, imageBase64: string | null) => {
    if (imageBase64) {
      setMessages(prev => [...prev, { id: Date.now().toString() + 'img', role: 'user', content: imageBase64, isImage: true }]);
      if (text) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text }]);
      }
    } else {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text }]);
    }

    setIsTyping(true);

    try {
      let imageAnalysis = "";
      if (imageBase64) {
        const analyzeRes = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageBase64 })
        });
        const analyzeData = await analyzeRes.json();
        imageAnalysis = analyzeData.description || "problème identifié";
      }

      const lowerText = text.toLowerCase();
      if (isExpertMode && (lowerText.includes('devis') || lowerText.includes('estimation') || lowerText.includes('prix'))) {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'expert',
          content: "Très bien, je vous prépare le devis réel pour cette intervention immédiatement."
        }]);
        
        setIsTyping(true);
        const devisRes = await fetch('/api/devis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context: text + " " + imageAnalysis })
        });
        const devisData = await devisRes.json();
        
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'expert',
          content: JSON.stringify(devisData),
          isEstimate: true
        }]);
        return;
      }

      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.isImage ? '[Image uploaded]' : m.content })).concat([{ role: 'user', content: text + (imageAnalysis ? `\n(Contexte image: ${imageAnalysis})` : '') }]),
          isExpertMode
        })
      });
      
      const chatData = await chatRes.json();
      setIsTyping(false);
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: isExpertMode ? 'expert' : 'ia',
        content: chatData.reply || "Désolé, je n'ai pas pu générer une réponse."
      }]);

    } catch (e) {
      console.error(e);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ia',
        content: "Une erreur de connexion est survenue. L'API est-elle bien configurée ?"
      }]);
    }
  };

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-100 fixed w-full z-20 top-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <Link href="/" className="flex items-center space-x-3 cursor-pointer group">
              <div className="w-10 h-10 bg-primary rounded flex items-center justify-center shadow-inner group-hover:bg-primaryLight transition">
                <span className="text-accent font-serif font-bold text-xl">A</span>
              </div>
              <span className="font-serif font-bold text-2xl text-primary tracking-wide uppercase group-hover:opacity-80 transition">Les Artistes</span>
            </Link>
            <div className="flex items-center space-x-6">
              <Link href="/" className="text-gray-600 hover:text-primary font-medium transition text-sm hidden sm:block">Accueil</Link>
              <a href="#assistant" className="text-white bg-primary hover:bg-primaryLight px-5 py-2.5 rounded-md font-medium transition shadow-md text-sm flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                <span>Discuter avec l'IA</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-28 pb-12 px-4 sm:px-6 flex flex-col items-center justify-center min-h-screen">
        
        {/* Header Text */}
        <div className="text-center max-w-2xl mb-10 fade-in">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary mb-4 leading-tight font-serif">L'expertise rénovation,<br/>maintenant augmentée par l'IA</h1>
          <p className="text-base sm:text-lg text-gray-600">Discutez avec notre IA ou faites appel à un expert pour chiffrer vos travaux instantanément. Précision, réactivité et savoir-faire professionnel.</p>
        </div>

        {/* Chat App Container */}
        <div id="assistant" className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col h-[650px] fade-in" style={{animationDelay: '0.1s'}}>
          
          {/* Chat Header */}
          <div className="bg-primary px-6 py-4 flex justify-between items-center text-white shadow-sm z-10">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-primary rounded-full"></span>
              </div>
              <div>
                <h2 className="font-bold text-lg leading-tight">
                  {isExpertMode ? "Expert Travaux" : "Assistant Les Artistes"}
                </h2>
                <p className="text-xs text-blue-200">En ligne</p>
              </div>
            </div>

            {/* Toggle Switch (IA / Expert) */}
            <div className="flex items-center space-x-3">
              <span id="mode-label" className="text-blue-100 font-medium text-sm transition-colors hidden sm:block">Mode IA</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="toggle-mode" className="sr-only peer" checked={isExpertMode} onChange={toggleExpertMode} />
                <div className="w-11 h-6 bg-blue-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent border border-blue-800"></div>
              </label>
            </div>
          </div>

          {/* Chat Messages Area */}
          <div id="chat-messages" className="flex-grow p-4 sm:p-6 overflow-y-auto scrollbar-hide bg-bgLight flex flex-col gap-5 relative">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            
            {isTyping && (
              <div className="flex w-full justify-start fade-in">
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-5 py-4 max-w-[70%] text-gray-700 flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <MessageInput onSend={handleSendMessage} />

        </div>
      </main>
    </>
  );
}
