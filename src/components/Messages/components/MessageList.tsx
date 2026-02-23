import { useRef, useEffect, useState } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { auth } from '../../../firebase';

interface MessageListProps {
  messages: any[];
  receiverName: string;
  isDark: boolean;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  setReplyingTo: (msg: any) => void;
  deleteForEveryone: (id: string, fileUrl?: string) => void;
  deleteForMe: (id: string) => void;
  markAsRead: (id: string) => void; // Prop is now used below!
}

export function MessageList({
  messages, receiverName, isDark, activeMenuId, setActiveMenuId,
  setReplyingTo, deleteForEveryone, deleteForMe, markAsRead
}: MessageListProps) {
  
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const snapshotIdsRef = useRef<Set<string>>(new Set());

  // Initialize or Update snapshot
  useEffect(() => {
    if (snapshotIdsRef.current.size === 0 && messages.length > 0) {
      snapshotIdsRef.current = new Set(messages.map(m => m.id));
    }
  }, []);

  // SCROLL LOGIC: Hand-tuned for "Send Only" scrolling
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const isMine = lastMsg.senderId === auth.currentUser?.uid;
      const isNew = !snapshotIdsRef.current.has(lastMsg.id);

      // Force scroll only if I sent it AND it's a new ID (not a deletion update)
      if (isMine && isNew) {
        setTimeout(() => {
          virtuosoRef.current?.scrollToIndex({
            index: messages.length - 1,
            behavior: 'smooth',
          });
        }, 100);
      }

      // Update snapshot for next render
      snapshotIdsRef.current = new Set(messages.map(m => m.id));
    }
  }, [messages.length]); 

  return (
    <div className="flex-1 relative flex flex-col min-h-0 overflow-hidden" onClick={() => setActiveMenuId(null)}>
      <Virtuoso
        ref={virtuosoRef}
        data={messages}
        className="custom-scrollbar"
        style={{ height: '100%', width: '100%' }}
        initialTopMostItemIndex={messages.length - 1}
        followOutput={(isAtBottom) => isAtBottom ? 'smooth' : false}
        atBottomThreshold={150}
        isScrolling={(scrolling) => { if (scrolling && activeMenuId) setActiveMenuId(null); }}
        computeItemKey={(_, item) => item.id}
        atBottomStateChange={(atBottom) => setShowJumpButton(!atBottom)}
        
        components={{
          // Header adds space at the very top of the chat history
          Header: () => <div className="h-4" />,
          // Footer adds that "room" you want at the bottom
          Footer: () => <div className="h-12" /> 
        }}
        
        itemContent={(index, msg) => {
          const prevMsg = index > 0 ? messages[index - 1] : undefined;
          const animateEntrance = !snapshotIdsRef.current.has(msg.id);

          // Mark as read when the message is rendered (visible)
          if (!msg.isRead && msg.senderId !== auth.currentUser?.uid) {
            markAsRead(msg.id);
          }

          return (
            <div className="px-4 py-1.5 flex flex-col">
              <MessageBubble 
                msg={msg}
                prevMsg={prevMsg}
                receiverName={receiverName}
                isDark={isDark}
                activeMenuId={activeMenuId}
                setActiveMenuId={setActiveMenuId}
                setReplyingTo={setReplyingTo}
                deleteForEveryone={deleteForEveryone}
                deleteForMe={deleteForMe}
                animateEntrance={animateEntrance} 
              />
            </div>
          );
        }}
      />

      <AnimatePresence>
        {showJumpButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 15 }}
            onClick={() => virtuosoRef.current?.scrollToIndex({ index: messages.length - 1, behavior: 'smooth' })}
            className={`absolute bottom-4 right-4 z-40 p-2.5 rounded-full shadow-lg border flex items-center justify-center transition-colors ${
              isDark ? 'bg-[#1e293b] border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            <ChevronDown size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}