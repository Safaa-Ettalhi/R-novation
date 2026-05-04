'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Role, Message } from '@/app/chat/page';
import EstimateCard from './EstimateCard';

interface ChatBubbleProps {
  message: Message;
  /** 'expert' flips own-message alignment and shows sender labels */
  viewerRole?: 'client' | 'expert';
}

export default function ChatBubble({ message, viewerRole = 'client' }: ChatBubbleProps) {
  // ── Estimate card ──────────────────────────────────────────────────────────
  if (message.isEstimate) {
    let data;
    try { data = JSON.parse(message.content); } catch { data = null; }
    if (data) return (
      <div className="flex w-full justify-start fade-in mb-4">
        <EstimateCard data={data} role={message.role} />
      </div>
    );
  }

  // ── System message (expert-only join notice, etc.) ─────────────────────────
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

  const isIA     = message.role === 'ia';
  const isExpert = message.role === 'expert';

  // ── Image bubble ───────────────────────────────────────────────────────────
  if (message.isImage) {
    const isBase64 = message.content.startsWith('data:image');
    if (!isBase64) return null;
    return (
      <div className={`flex w-full ${isOwnMessage ? 'justify-end' : 'justify-start'} fade-in mb-4`}>
        {!isOwnMessage && <SenderAvatar role={message.role} />}
        <div className={`rounded-2xl p-2 max-w-[85%] sm:max-w-[70%] shadow-md overflow-hidden ${
          isOwnMessage ? 'bg-primary rounded-tr-sm' : 'bg-white border border-gray-200 rounded-tl-sm'
        }`}>
          {/* Show real name or role label above image */}
          {!isOwnMessage && (
            <SenderLabel role={message.role} senderName={message.senderName} />
          )}
          <img src={message.content} alt="Image partagée" className="max-w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Text bubble ────────────────────────────────────────────────────────────
  return (
    <div className={`flex w-full items-end gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'} fade-in mb-4`}>
      {/* Left avatar (non-own messages) */}
      {!isOwnMessage && <SenderAvatar role={message.role} />}

      <div className={`max-w-[82%] sm:max-w-[70%] ${isOwnMessage ? '' : 'flex flex-col'}`}>
        {/* Sender label with real name — always shown for non-own messages */}
        {!isOwnMessage && (
          <SenderLabel role={message.role} senderName={message.senderName} />
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

      {/* Right avatar for own messages */}
      {isOwnMessage && <OwnAvatar viewerRole={viewerRole} />}
    </div>
  );
}

/* ── Helper sub-components ────────────────────────────────────────────────── */

function SenderAvatar({ role }: { role: Role }) {
  if (role === 'ia') return (
    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mb-1" title="Assistant IA">
      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    </div>
  );
  if (role === 'expert') return (
    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0 mb-1" title="Expert artisan">
      <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    </div>
  );
  // user / client
  return (
    <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0 mb-1" title="Client">
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    </div>
  );
}

/** Small avatar shown on the right for the viewer's own messages */
function OwnAvatar({ viewerRole }: { viewerRole: 'client' | 'expert' }) {
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mb-1 ${
      viewerRole === 'expert' ? 'bg-gray-800' : 'bg-primary/20'
    }`}>
      <svg className={`w-3.5 h-3.5 ${viewerRole === 'expert' ? 'text-accent' : 'text-primary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    </div>
  );
}

/**
 * Sender label displayed above the bubble.
 * Shows the real full name when available, otherwise falls back to a role badge.
 * For IA messages, always shows the "IA" badge regardless.
 */
function SenderLabel({ role, senderName }: { role: Role; senderName?: string }) {
  if (role === 'ia') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest mb-1 ml-1 text-primary/70">
        <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-widest">IA</span>
        Assistant Les Artistes
      </span>
    );
  }

  if (senderName) {
    // Display real name with a small role chip
    const chip = role === 'expert'
      ? <span className="bg-gray-700 text-accent px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest">Artisan</span>
      : <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest">Client</span>;
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold mb-1 ml-1 text-gray-600">
        {chip}
        {senderName}
      </span>
    );
  }

  // Fallback when name not yet loaded
  const fallback: Record<string, { label: string; cls: string }> = {
    expert: { label: 'Artisan', cls: 'text-gray-500' },
    user:   { label: 'Client',  cls: 'text-blue-500' },
  };
  const cfg = fallback[role] ?? { label: role, cls: 'text-gray-400' };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ml-1 ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
