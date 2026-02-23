import { motion, AnimatePresence } from 'framer-motion';
import { Check, CheckCheck, Clock, Ban, ChevronDown, FileText, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { auth } from '../../../firebase';
import { useFloating, offset, flip, shift } from '@floating-ui/react';
import { createPortal } from 'react-dom';

interface MessageBubbleProps {
  msg: any;
  prevMsg?: any;
  receiverName: string;
  isDark: boolean;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  setReplyingTo: (msg: any) => void;
  deleteForEveryone: (id: string, fileUrl?: string) => void;
  deleteForMe: (id: string) => void;
  isDeleting: boolean;
  onJumpToReply: (id: string) => void; // <- Added this
  isHighlighted: boolean;
}

const DELETE_TIME_LIMIT = 60 * 60 * 1000; 

const formatTime = (timestamp: number | null | undefined) => {
  if (!timestamp) return '';
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(timestamp);
};

const isSameDay = (t1: number | null | undefined, t2: number | null | undefined) => {
  if (!t1 || !t2) return true;
  return new Date(t1).toDateString() === new Date(t2).toDateString();
};

const getDateDividerLabel = (timestamp: number | null | undefined, t: any) => {
  if (!timestamp) return t('chat.today', 'Today');
  const date = new Date(timestamp);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return t('chat.today', 'Today');
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

export function MessageBubble({ 
  msg, prevMsg, receiverName, isDark, 
  activeMenuId, setActiveMenuId, setReplyingTo, deleteForEveryone, deleteForMe,
  isDeleting,
  onJumpToReply,
  isHighlighted
}: MessageBubbleProps) {
  const { t } = useTranslation();
  
  const isMine = msg.senderId === auth.currentUser?.uid;
  const isMenuOpen = activeMenuId === msg.id;
  const isDeletedForMe = msg.deletedFor?.includes(auth.currentUser?.uid);
  
  const showDateDivider = !prevMsg || !isSameDay(msg.createdAt, prevMsg.createdAt);
  const isPrevSame = prevMsg?.senderId === msg.senderId;
  const canDeleteAll = isMine && (Date.now() - (msg.createdAt || Date.now()) < DELETE_TIME_LIMIT);
  const borderTheme = isDark ? 'border-gray-800' : 'border-gray-200';

  const { refs, floatingStyles } = useFloating({
    open: isMenuOpen,
    placement: isMine ? 'bottom-end' : 'bottom-start',
    middleware: [offset(-4), flip({ padding: { bottom: 180, top: 20 } }), shift({ padding: 8 })]
  });

  const handleMenuToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setActiveMenuId(isMenuOpen ? null : msg.id);
  };

  if (isDeletedForMe) return null;

  return (
    <>
      {/* 1. DATE DIVIDER MOVED OUTSIDE: It will no longer fade out when deleting a message */}
      {showDateDivider && (
        <div className="flex justify-center my-4">
            <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-gray-200 dark:bg-slate text-gray-500">
              {getDateDividerLabel(msg.createdAt, t)}
            </span>
        </div>
      )}

      {/* 2. ONLY THE BUBBLE FADES NOW */}
      <motion.div 
        animate={isDeleting ? { opacity: 0, scale: 0.95 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="flex flex-col w-full relative py-1.5" 
      >
        <div className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'} ${isPrevSame ? 'mt-1' : 'mt-4'}`}>
          <div ref={refs.setReference} className="relative group max-w-[80%]">
            
            <div className={`py-2 px-4 shadow-sm overflow-hidden transition-all duration-500
              ${isMine 
                ? `rounded-[12px] rounded-br-[2px] bg-primary text-white ${
                    // Highlights YOUR messages with a bright pop and a soft white ring
                    isHighlighted ? 'brightness-110 scale-[1.02] shadow-md ring-2 ring-white/50' : ''
                  }` 
                : `rounded-[12px] rounded-bl-[2px] border ${borderTheme} ${
                    // Highlights THEIR messages using your exact theme's primary color at low opacity
                    isHighlighted 
                      ? (isDark 
                          ? 'bg-primary/20 scale-[1.02] shadow-md ring-2 ring-primary/50' 
                          : 'bg-primary/10 scale-[1.02] shadow-md ring-2 ring-primary/30') 
                      : 'bg-white dark:bg-slate'
                  }`
              }`}
            >
              <AnimatePresence mode="popLayout">
                {msg.isDeleted ? (
                  <div key="deleted" className="flex items-center gap-1 opacity-50 italic text-sm">
                    <Ban size={14}/> {t('chat.deletedMessage', 'This message was removed')}
                  </div>
                ) : (
                  <div key="content">
                    {msg.replyTo && !msg.isDeleted && (
                      <button 
                        onClick={() => onJumpToReply(msg.replyTo.id)}
                        className="w-full text-left relative mb-2 px-3 py-2 rounded bg-black/10 dark:bg-white/10 text-xs overflow-hidden hover:bg-black/20 dark:hover:bg-white/20 transition-colors cursor-pointer"
                      >
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isMine ? 'bg-white/60' : 'bg-primary/80'}`} />
                        <span className="font-semibold tracking-wide block opacity-90">
                          {msg.replyTo.senderId === auth.currentUser?.uid ? 'You' : receiverName}
                        </span>
                        <span className="truncate block opacity-75 mt-0.5">{msg.replyTo.text || 'File'}</span>
                      </button>
                    )}

                    <div className="flex flex-col gap-1">
                      {msg.fileUrl && (
                        msg.fileType?.startsWith('image/') 
                          ? <img src={msg.fileUrl} alt="attachment" className="max-w-full rounded-lg mt-1 min-h-[120px] bg-black/10 object-cover" />
                          : (
                            <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 mt-1 rounded bg-black/10 dark:bg-white/10 hover:bg-black/20 transition-colors group/file relative pr-8">
                              <div className={`p-2 rounded-lg ${isMine ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}><FileText size={20}/></div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-medium truncate max-w-[150px]">{msg.fileName || 'Document'}</span>
                                <span className="text-[10px] opacity-60 uppercase font-bold">{msg.fileType?.split('/')[1] || 'File'}</span>
                              </div>
                              <Download size={14} className="ml-auto opacity-40" />
                            </a>
                          )
                      )}
                      {msg.text && <span className="whitespace-pre-wrap break-words break-all">{msg.text}</span>}
                    </div>
                  </div>
                )}
              </AnimatePresence>
              
              <div className="flex justify-end items-center gap-1 mt-1 opacity-60 text-[10px]">
                <span>{formatTime(msg.createdAt)}</span>
                {isMine && (
                  <div className="w-4 flex justify-end">
                    {(!msg.createdAt || msg.isPending) ? <Clock size={10} /> : msg.isRead ? <CheckCheck size={12} className="text-blue-400" /> : <Check size={12} />}
                  </div>
                )}
              </div>
            </div>

            {!msg.isDeleted && (
              <button 
                onClick={handleMenuToggle} 
                className={`absolute top-1.5 right-1.5 p-1 rounded-full backdrop-blur-md transition-opacity z-10 
                  ${isMine ? 'bg-primary/80 text-white' : 'bg-white/80 dark:bg-slate-800/80'} 
                  ${isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <ChevronDown size={14}/>
              </button>
            )}

            {createPortal(
              <AnimatePresence>
                {isMenuOpen && (
                  <div ref={refs.setFloating} style={{ ...floatingStyles, zIndex: 9999 }}>
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -5 }}
                      className={`w-36 rounded-xl shadow-2xl border ${isDark ? 'bg-[#1e293b] border-gray-700' : 'bg-white border-gray-200'} overflow-hidden`}
                    >
                        <button onClick={() => { setReplyingTo(msg); setActiveMenuId(null); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-black/5 transition-colors">Reply</button>
                        {canDeleteAll && <button onClick={() => { deleteForEveryone(msg.id, msg.fileUrl); setActiveMenuId(null); }} className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors font-medium">Delete for all</button>}
                        <button onClick={() => { deleteForMe(msg.id); setActiveMenuId(null); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-black/5 transition-colors">Delete for me</button>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>,
              document.body
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}