import React from 'react';
import { Role, Message } from '@/app/chat/page';
import EstimateCard from './EstimateCard';

export default function ChatBubble({ message }: { message: Message }) {
  if (message.isEstimate) {
    let data;
    try { data = JSON.parse(message.content); } catch (e) { data = null; }
    if (data) {
      return (
        <div className="flex w-full justify-start fade-in mb-4">
          <EstimateCard data={data} role={message.role} />
        </div>
      );
    }
  }

  if (message.role === 'system') {
    return (
      <div className="flex w-full justify-center fade-in mb-4">
        <div className="px-4 py-2 rounded-full bg-accent/15 border border-accent/30 text-xs sm:text-sm text-primary font-medium text-center max-w-[90%]">
          {message.content}
        </div>
      </div>
    );
  }

  const isUser = message.role === 'user';
  const isExpert = message.role === 'expert';

  if (message.isImage) {
    return (
      <div className="flex w-full justify-end fade-in mb-4">
        <div className="bg-primary text-white rounded-2xl rounded-tr-sm p-2 max-w-[85%] sm:max-w-[70%] shadow-md">
          <img src={message.content} alt="Uploaded" className="max-w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} fade-in mb-4`}>
      <div className={`px-5 py-3.5 max-w-[85%] sm:max-w-[70%] text-sm sm:text-base leading-relaxed shadow-sm ${
        isUser 
          ? 'bg-primary text-white rounded-2xl rounded-tr-sm font-medium' 
          : isExpert 
            ? 'bg-gray-800 text-white rounded-2xl rounded-tl-sm' 
            : 'bg-white border border-gray-100 text-gray-700 rounded-2xl rounded-tl-sm'
      }`}>
        {!isUser && isExpert && (
          <div className="flex items-center gap-2 mb-1.5 border-b border-gray-700 pb-1.5">
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            <span className="text-xs font-bold text-accent tracking-wider uppercase">Expertise</span>
          </div>
        )}
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
}
