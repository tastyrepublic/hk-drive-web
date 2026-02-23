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
  markAsRead: (id: string) => void;
}

export function MessageList({
  messages, receiverName, isDark, activeMenuId, setActiveMenuId,
  setReplyingTo, deleteForEveryone, deleteForMe, markAsRead
}: MessageListProps) {
  
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const snapshotIdsRef = useRef<Set<string>>(new Set());

  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // 2. ADD THIS NEW FUNCTION: To scroll and highlight
  const handleJumpToReply = (targetId: string) => {
    const targetIndex = messages.findIndex(m => m.id === targetId);
    if (targetIndex !== -1 && virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({
        index: targetIndex,
        align: 'center', 
        behavior: 'smooth'
      });
      setHighlightedId(targetId);
      setTimeout(() => setHighlightedId(null), 1500);
    }
  };

  // Lightning-fast 150ms timeout to allow the fade out before the layout snaps
  const handleLocalDeleteForMe = (id: string) => {
    setDeletingIds(prev => new Set(prev).add(id)); 
    setTimeout(() => {
      deleteForMe(id); 
    }, 150); 
  };

  useEffect(() => {
    if (snapshotIdsRef.current.size === 0 && messages.length > 0) {
      snapshotIdsRef.current = new Set(messages.map(m => m.id));
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const isMine = lastMsg.senderId === auth.currentUser?.uid;
      const isNew = !snapshotIdsRef.current.has(lastMsg.id);

      if (isMine && isNew) {
        setTimeout(() => {
          virtuosoRef.current?.scrollToIndex({ index: messages.length - 1, behavior: 'smooth' });
        }, 100);
      }
      snapshotIdsRef.current = new Set(messages.map(m => m.id));
    }
  }, [messages.length]); 

  return (
    <div className="flex-1 relative flex flex-col min-h-0 overflow-hidden" onClick={() => setActiveMenuId(null)}>
      <Virtuoso
        ref={virtuosoRef}
        data={messages}
        className="custom-scrollbar overflow-y-scroll"
        style={{ height: '100%', width: '100%', scrollbarGutter: 'stable' }}
        initialTopMostItemIndex={messages.length - 1}
        followOutput={(isAtBottom) => isAtBottom ? 'smooth' : false}
        atBottomThreshold={150}
        isScrolling={(scrolling) => { if (scrolling && activeMenuId) setActiveMenuId(null); }}
        computeItemKey={(_, item) => item.id}
        atBottomStateChange={(atBottom) => setShowJumpButton(!atBottom)}
        
        components={{
          Header: () => <div className="h-4" />,
          Footer: () => <div className="h-12" /> 
        }}
        
        itemContent={(index, msg) => {
          const prevMsg = index > 0 ? messages[index - 1] : undefined;
          const isDeleting = deletingIds.has(msg.id);

          if (!msg.isRead && msg.senderId !== auth.currentUser?.uid) {
            markAsRead(msg.id);
          }

          return (
            <div className="px-4 flex flex-col w-full">
              <MessageBubble 
                msg={msg}
                prevMsg={prevMsg}
                receiverName={receiverName}
                isDark={isDark}
                activeMenuId={activeMenuId}
                setActiveMenuId={setActiveMenuId}
                setReplyingTo={setReplyingTo}
                deleteForEveryone={deleteForEveryone}
                deleteForMe={handleLocalDeleteForMe}
                isDeleting={isDeleting} 
                onJumpToReply={handleJumpToReply}
                isHighlighted={highlightedId === msg.id}
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