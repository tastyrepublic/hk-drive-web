import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, UserCircle2, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMessages } from '../../hooks/useMessages';
import { auth } from '../../firebase';

interface Props {
  activeChatId?: string;
  receiverId: string;
  receiverName: string;
  isDark: boolean;
  onBack?: () => void; // Used on mobile to return to the Inbox list
}

export function ChatBox({ activeChatId, receiverId, receiverName, isDark, onBack }: Props) {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 1. Only load this specific conversation
  const { messages, sendMessage, markAsRead } = useMessages(activeChatId);

  // 2. Auto-scroll to the bottom when a new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Mark messages as read when they appear on screen
  useEffect(() => {
    messages.forEach(msg => {
      if (!msg.isRead && msg.senderId !== auth.currentUser?.uid) {
        markAsRead(msg.id);
      }
    });
  }, [messages, markAsRead]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    await sendMessage(receiverId, inputText);
    setInputText('');
  };

  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const bgTheme = isDark ? 'bg-midnight' : 'bg-gray-50';
  const borderTheme = isDark ? 'border-gray-800' : 'border-gray-200';

  // EMPTY STATE
  if (!activeChatId) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center ${bgTheme} rounded-xl border ${borderTheme} h-full`}>
         <UserCircle2 size={48} className={`${textMuted} mb-4 opacity-30`} />
         <p className={`text-sm font-bold ${textMuted}`}>{t('chat.selectToStart', 'Select a conversation to start chatting')}</p>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col h-full rounded-xl border overflow-hidden ${bgTheme} ${borderTheme}`}>
      {/* HEADER */}
      <div className={`p-4 border-b flex items-center gap-3 shrink-0 bg-opacity-50 ${borderTheme}`}>
        {onBack && (
          <button onClick={onBack} className={`sm:hidden p-1 -ml-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-200 text-gray-700'}`}>
            <ChevronLeft size={24} />
          </button>
        )}
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
          {receiverName.charAt(0).toUpperCase()}
        </div>
        <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{receiverName}</span>
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => {
          const isMine = msg.senderId === auth.currentUser?.uid;
          return (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                isMine 
                  ? 'bg-primary text-white rounded-br-sm' 
                  : `${isDark ? 'bg-slate text-gray-200' : 'bg-white text-gray-800'} border ${borderTheme} rounded-bl-sm`
              }`}>
                {msg.text}
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <div className={`p-3 border-t shrink-0 ${borderTheme} ${isDark ? 'bg-slate/50' : 'bg-white'}`}>
        <div className="flex items-end gap-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t('chat.typeMessage', 'Type a message...')}
            className={`flex-1 max-h-32 min-h-[44px] bg-transparent border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary custom-scrollbar ${borderTheme} ${isDark ? 'text-white' : 'text-gray-900'}`}
            rows={1}
          />
          <button 
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 shadow-sm"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}