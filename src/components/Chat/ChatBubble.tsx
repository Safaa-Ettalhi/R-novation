'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Role, Message } from '@/app/chat/page';
import EstimateCard from './EstimateCard';

interface ChatBubbleProps {
  message: Message;
  /** When passed as 'expert', own messages flip to right and sender labels are shown */
  viewerRole?: 'client' | 'expert';
}

export default function ChatBubble({ message, viewerRole = 'client' }: ChatBubbleProps) {
  // ── Estimate card ───────────────────────────────────────────────────────────
  if (message.isEstimate) {
    let data;
    try { data = JSON.parse(message.content); } catch { data = null; }
    if (data) return (
      <div className="flex w-full justify-start fade-in mb-4">
        <EstimateCard data={data} role={message.role} />
      </div>
    );
  }

  // ── System message ──────────────────────────────────────────────────────────
  if (message.role === 'system') {
    return (
      <div className="flex w-full justify-center fade-in mb-4">
        <div className="px-4 py-2 rounded-full bg-accent/15 border border-accent/30 text-xs sm:text-sm text-primary font-semibold text-center max-w-[90%] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
          {message.content}
        </div>
      </div>
    );
  }

  const isOwnMessage =
    (viewerRole === 'client' && message.role === 'user') ||
    (viewerRole === 'expert' && message.role === 'expert');

  const isIA      = message.role === 'ia';
  const isExpert  = message.role === 'expert';
  const isClient  = message.role === 'user';

  // ── Image bubble ────────────────────────────────────────────────────────────
  if (message.isImage) {
    const isBase64 = message.content.startsWith('data:image');
    if (!isBase64) return null;
    return (
      <div className={`flex w-full ${isOwnMessage ? 'justify-end' : 'justify-start'} fade-in mb-4`}>
        {!isOwnMessage && viewerRole === 'expert' && (
          <SenderAvatar role={message.role} />
        )}
        <div className={`rounded-2xl p-2 max-w-[85%] sm:max-w-[70%] shadow-md overflow-hidden ${
          isOwnMessage ? 'bg-primary rounded-tr-sm' : 'bg-white border border-gray-200 rounded-tl-sm'
        }`}>
          {viewerRole === 'expert' && !isOwnMessage && (
            <SenderLabel role={message.role} />
          )}
          <img src={message.content} alt="Image partagée" className="max-w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Text bubble ─────────────────────────────────────────────────────────────
  return (
    <div className={`flex w-full items-end gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'} fade-in mb-4`}>
      {/* Left avatar (non-own messages) */}
      {!isOwnMessage && <SenderAvatar role={message.role} />}

      <div className={`max-w-[82%] sm:max-w-[70%] ${isOwnMessage ? '' : 'flex flex-col'}`}>
        {/* Sender label — only in expert view for non-own messages */}
        {viewerRole === 'expert' && !isOwnMessage && (
          <SenderLabel role={message.role} />
        )}

        <div className={`px-4 py-3 text-sm sm:text-base leading-relaxed shadow-sm ${
          isOwnMessage
            ? 'bg-primary text-white rounded-2xl rounded-tr-sm font-medium'
            : isExpert
              ? 'bg-gray-900 text-white rounded-2xl rounded-tl-sm'
              : isIA
                ? 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm'
                : 'bg-blue-50 border border-blue-100 text-gray-800 rounded-2xl rounded-tl-sm'
        }`}>
          {/* Expert badge inside own expert bubble */}
          {isExpert && isOwnMessage && (
            <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-white/20">
              <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-[10px] font-bold text-accent tracking-widest uppercase">Expert</span>
            </div>
          )}

          {/* Content — Markdown for IA/expert, plain for user */}
          {(isIA || isExpert) ? (
            <div className={`prose prose-sm max-w-none ${isExpert ? 'prose-invert' : 'prose-gray'}`}>
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Helper sub-components ──────────────────────────────────────────────────── */

function SenderAvatar({ role }: { role: Role }) {
  if (role === 'ia') return (
    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mb-1">
      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    </div>
  );
  if (role === 'expert') return (
    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0 mb-1">
      <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    </div>
  );
  // user / client
  return (
    <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0 mb-1">
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    </div>
  );
}

function SenderLabel({ role }: { role: Role }) {
  const map: Record<string, { label: string; cls: string }> = {
    ia:     { label: 'IA',     cls: 'text-primary/70' },
    expert: { label: 'Expert', cls: 'text-gray-500' },
    user:   { label: 'Client', cls: 'text-blue-500' },
  };
  const cfg = map[role] ?? { label: role, cls: 'text-gray-400' };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ml-1 ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
