import React, { useState, useRef, useEffect } from 'react';

interface MessageInputProps {
  onSend: (text: string, imageBase64: string | null) => void;
}

export default function MessageInput({ onSend }: MessageInputProps) {
  const [text, setText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setImageBase64(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = () => {
    if (!text.trim() && !imageBase64) return;
    onSend(text, imageBase64);
    setText('');
    setImageBase64(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleGenerateDevisClick = () => {
    onSend("Je souhaite générer un devis pour ces travaux.", null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  return (
    <>
      {/* Action Bar (Devis) */}
      <div className="bg-white px-4 py-2.5 border-t border-gray-100 flex gap-2 overflow-x-auto scrollbar-hide shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] z-10">
        <button 
          onClick={handleGenerateDevisClick}
          className="flex-shrink-0 flex items-center space-x-1.5 text-xs font-semibold text-primary bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition whitespace-nowrap border border-blue-100 shadow-sm"
        >
          <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          <span>Générer un devis</span>
        </button>
      </div>

      {/* Input Area */}
      <div className="bg-white p-3 sm:p-4 border-t border-gray-200 flex flex-col">
        {/* Image Preview */}
        {imageBase64 && (
          <div className="relative mb-3 w-max">
            <img src={imageBase64} alt="Aperçu" className="h-20 w-auto rounded-lg border border-gray-200 shadow-sm object-cover" />
            <button 
              onClick={() => setImageBase64(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-red-600 shadow-sm transition" 
              title="Supprimer l'image"
            >
              &times;
            </button>
          </div>
        )}
        
        <div className="flex items-end space-x-2 sm:space-x-3 relative max-w-full">
          {/* File input */}
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 cursor-pointer p-2.5 text-gray-400 hover:text-primary hover:bg-gray-100 transition rounded-full mb-0.5" 
            title="Ajouter une image"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </button>
          
          {/* Textarea */}
          <textarea 
            ref={textareaRef}
            rows={1}
            className="flex-grow bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-primary focus:border-primary block w-full p-3 sm:p-3.5 resize-none scrollbar-hide shadow-inner transition"
            placeholder="Écrivez votre message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ maxHeight: '120px' }}
          ></textarea>
          
          {/* Send Button */}
          <button 
            onClick={handleSend}
            className={`flex-shrink-0 p-3 sm:p-3.5 rounded-xl transition shadow-md group mb-0.5 ${text.trim() || imageBase64 ? 'bg-primary text-white hover:bg-primaryLight' : 'bg-primary text-white'}`}
            title="Envoyer"
          >
            <svg className="w-5 h-5 transform rotate-90 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          </button>
        </div>
      </div>
    </>
  );
}
