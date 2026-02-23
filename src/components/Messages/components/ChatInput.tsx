import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Paperclip } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { auth } from '../../../firebase'; // Adjust path if needed

interface ChatInputProps {
  onSendMessage: (text: string) => Promise<void>;
  onSendAttachment: (file: File, onProgress: (p: number) => void) => Promise<void>;
  replyingTo: any | null;
  setReplyingTo: (msg: any | null) => void;
  receiverName: string;
  isDark: boolean;
}

const MAX_CHARS = 1000;

export function ChatInput({ 
  onSendMessage, 
  onSendAttachment, 
  replyingTo, 
  setReplyingTo, 
  receiverName, 
  isDark 
}: ChatInputProps) {
  const { t } = useTranslation();
  
  // Local state just for the input area
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const borderTheme = isDark ? 'border-gray-800' : 'border-gray-200';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px'; 
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 128)}px`; 
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    if (textareaRef.current) textareaRef.current.style.height = '44px';
    
    await onSendMessage(text);
    
    // NEW: Clear the reply state after sending a text message!
    setReplyingTo(null); 
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      await onSendAttachment(file, (progress) => {
        setUploadProgress(progress);
      });
      
      // NEW: Clear the reply state after sending an attachment!
      setReplyingTo(null);
      
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  return (
    <div className={`flex flex-col shrink-0 border-t ${borderTheme} ${isDark ? 'bg-slate/50' : 'bg-white'}`}>
      
      {/* Replying To UI */}
      <AnimatePresence initial={false}>
        {replyingTo && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className={`flex items-center justify-between px-4 py-2 text-sm border-b ${borderTheme}`}>
              <div className="flex flex-col border-l-4 border-primary pl-3 overflow-hidden flex-1 mr-4">
                <span className={`font-bold text-[11px] mb-0.5 ${isDark ? 'text-primary' : 'text-primary'}`}>
                  {replyingTo.senderId === auth.currentUser?.uid ? t('chat.you', 'You') : receiverName}
                </span>
                <span className={`truncate text-xs ${textMuted}`}>{replyingTo.text || 'File'}</span>
              </div>
              <button 
                onClick={() => setReplyingTo(null)} 
                className={`p-1.5 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-500'}`}
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-3">
        <div className="flex items-end gap-2">
          
          {/* Hidden File Input */}
          <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
          
          {/* Attachment Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`p-2.5 rounded-xl transition-colors shrink-0 flex items-center justify-center h-[44px] ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-500'}`}
          >
            {isUploading ? (
              <div className="relative flex items-center justify-center w-5 h-5">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" className={isDark ? "text-gray-700" : "text-gray-200"} />
                  <path strokeDasharray={`${uploadProgress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary transition-all duration-200" />
                </svg>
              </div>
            ) : (
              <Paperclip size={20} />
            )}
          </button>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            value={inputText}
            maxLength={MAX_CHARS}
            onChange={handleInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t('chat.typeMessage', 'Type a message...')}
            className={`flex-1 min-h-[44px] bg-transparent border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${borderTheme} ${isDark ? 'text-white' : 'text-gray-900'}`}
            rows={1}
            style={{ height: '44px' }}
          />
          
          {/* Send Button */}
          <button 
            onClick={handleSend}
            disabled={!inputText.trim() && !isUploading}
            className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 shadow-sm flex items-center justify-center h-[44px]"
          >
            <Send size={18} />
          </button>
        </div>
        
        {/* Character Limit */}
        {inputText.length > MAX_CHARS * 0.8 && (
           <div className={`text-[10px] text-right pr-14 mt-1 ${inputText.length >= MAX_CHARS ? 'text-red-500 font-bold' : textMuted}`}>
             {inputText.length} / {MAX_CHARS}
           </div>
        )}
      </div>
    </div>
  );
}