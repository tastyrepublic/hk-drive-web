import { useState } from 'react';
import { UserCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMessages } from '../../hooks/useMessages';

// Adjust the import paths depending on where you saved these files
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';

interface Props {
  activeChatId?: string;
  receiverId: string;
  receiverName: string;
  isDark: boolean;
  onBack?: () => void;
}

export function ChatBox({ activeChatId, receiverId, receiverName, isDark, onBack }: Props) {
  const { t } = useTranslation();
  
  // These two small states are all the parent needs to manage now
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  
  const { 
    messages, 
    sendMessage, 
    sendAttachment, 
    markAsRead, 
    deleteForMe, 
    deleteForEveryone 
  } = useMessages(activeChatId);

  const borderTheme = isDark ? 'border-gray-800' : 'border-gray-200';
  const bgTheme = isDark ? 'bg-midnight' : 'bg-gray-50';

  // Empty State
  if (!activeChatId) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center ${bgTheme} rounded-xl border ${borderTheme} h-full`}>
         <UserCircle2 size={48} className="text-gray-500 mb-4 opacity-30" />
         <p className="text-sm font-bold text-gray-500">{t('chat.selectToStart', 'Select a conversation to start chatting')}</p>
      </div>
    );
  }

  return (
    <div 
      onClick={() => setActiveMenuId(null)} // <-- Add this
      className={`flex-1 flex flex-col h-full rounded-xl border overflow-hidden ${bgTheme} ${borderTheme}`}
    >

      {/* 1. The Top Bar */}
      <ChatHeader 
        receiverName={receiverName} 
        isDark={isDark} 
        onBack={onBack} 
      />

      {/* 2. The Virtualized Message Area */}
      <MessageList 
        messages={messages}
        receiverName={receiverName}
        isDark={isDark}
        activeMenuId={activeMenuId}
        setActiveMenuId={setActiveMenuId}
        setReplyingTo={setReplyingTo}
        deleteForEveryone={deleteForEveryone}
        deleteForMe={deleteForMe}
        markAsRead={markAsRead}
      />

      {/* 3. The Text Area & Attachments */}
      <ChatInput 
  onSendMessage={(text) => sendMessage(receiverId, text, replyingTo)}
  onSendAttachment={async (fileData, text) => {
    // We call a new helper or the existing one with the pre-uploaded URL
    await sendAttachment(receiverId, fileData.url, text, fileData.name, fileData.type, replyingTo);
  }}        
        replyingTo={replyingTo}
        setReplyingTo={setReplyingTo}
        receiverName={receiverName}
        isDark={isDark}
      />
      
    </div>
  );
}