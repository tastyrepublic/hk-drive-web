import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CheckCheck, Clock, Ban, ChevronDown, FileText, Download, X } from 'lucide-react';
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
  deleteForEveryone: (id: string, attachments?: any[]) => void;
  deleteForMe: (id: string) => void;
  isDeleting: boolean;
  onJumpToReply: (id: string) => void;
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

// --- NEW PRO COMPONENT DEFINED OUTSIDE ---
const ImageAttachment = ({ url, thumbnail, isSingle, onClick, onDownload, fileName }: any) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div 
      onClick={onClick}
      className="relative group overflow-hidden rounded-lg bg-black/10 cursor-pointer"
    >
      {/* 1. THE PRO THUMBNAIL: Renders instantly from Firestore text data */}
      {thumbnail && (
        <img 
          src={thumbnail} 
          alt="blur" 
          className={`absolute inset-0 w-full h-full object-cover blur-md scale-110 ${isSingle ? 'max-h-[280px]' : 'h-[140px]'}`} 
        />
      )}
      
      {/* 2. THE HIGH-RES IMAGE: Fades in smoothly over the thumbnail when ready */}
      <img 
        src={url} 
        alt="attachment" 
        onLoad={() => setIsLoaded(true)}
        className={`relative z-10 w-full object-cover block transition-opacity duration-500 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${isSingle ? 'h-auto max-h-[280px]' : 'h-[140px]'}`} 
      />
      
      {/* Hover Download Button */}
      <div className="absolute inset-0 z-20 bg-black/0 group-hover:bg-black/20 transition-all flex items-end justify-end p-2 opacity-0 group-hover:opacity-100">
        <button
          onClick={(e) => onDownload(e, url, fileName)}
          className="p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-all shadow-sm"
          title="Download Image"
        >
          <Download size={14} />
        </button>
      </div>
    </div>
  );
};
// ------------------------------------------

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

  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  const { refs, floatingStyles } = useFloating({
    open: isMenuOpen,
    placement: isMine ? 'bottom-end' : 'bottom-start',
    middleware: [offset(-4), flip({ padding: { bottom: 180, top: 20 } }), shift({ padding: 8 })]
  });

  const handleMenuToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setActiveMenuId(isMenuOpen ? null : msg.id);
  };

  const handleDownload = async (e: React.MouseEvent, url: string, filename: string) => {
    e.stopPropagation(); 
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'image.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed", error);
      window.open(url, '_blank');
    }
  };

  if (isDeletedForMe) return null;

  return (
    <>
      {showDateDivider && (
        <div className="flex justify-center my-4">
            <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-gray-200 dark:bg-slate text-gray-500">
              {getDateDividerLabel(msg.createdAt, t)}
            </span>
        </div>
      )}

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
                    isHighlighted ? 'brightness-110 scale-[1.02] shadow-md ring-2 ring-white/50' : ''
                  }` 
                : `rounded-[12px] rounded-bl-[2px] border ${borderTheme} ${
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

                    <div className="flex flex-col gap-1 w-full">
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className={`grid gap-1.5 mt-1 ${
                          msg.attachments.filter((a: any) => a.fileType?.startsWith('image/')).length > 1 
                            ? 'grid-cols-2' 
                            : 'grid-cols-1 max-w-[280px]' 
                        }`}>
                          {msg.attachments.map((att: any, index: number) => (
                            att.fileType?.startsWith('image/') ? (
                              <ImageAttachment 
                                key={index}
                                url={att.fileUrl}
                                thumbnail={att.thumbnail} 
                                fileName={att.fileName}
                                isSingle={msg.attachments.length === 1}
                                onClick={() => setEnlargedImage(att.fileUrl)}
                                onDownload={handleDownload}
                              />
                            ) : (
                              <a key={index} href={att.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded bg-black/10 dark:bg-white/10 hover:bg-black/20 transition-colors group/file relative pr-8 w-full col-span-full">
                                <div className={`p-2 rounded-lg shrink-0 ${isMine ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}><FileText size={20}/></div>
                                <div className="flex flex-col overflow-hidden w-full">
                                  <span className="text-sm font-medium truncate w-full">{att.fileName || 'Document'}</span>
                                  <span className="text-[10px] opacity-60 uppercase font-bold">{att.fileType?.split('/')[1] || 'File'}</span>
                                </div>
                                <Download size={14} className="ml-auto opacity-40 shrink-0" />
                              </a>
                            )
                          ))}
                        </div>
                      )}

                      {msg.text && <span className="whitespace-pre-wrap break-words break-all mt-1">{msg.text}</span>}
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
                        {canDeleteAll && <button onClick={() => { deleteForEveryone(msg.id, msg.attachments); setActiveMenuId(null); }} className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors font-medium">Delete for all</button>}
                        <button onClick={() => { deleteForMe(msg.id); setActiveMenuId(null); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-black/5 transition-colors">Delete for me</button>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>,
              document.body
            )}
            
            {createPortal(
              <AnimatePresence>
                {enlargedImage && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => setEnlargedImage(null)}
                    className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 p-4 sm:p-8 cursor-zoom-out backdrop-blur-sm"
                  >
                    <button 
                      onClick={() => setEnlargedImage(null)}
                      className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 bg-white/10 hover:bg-white/25 text-white rounded-full backdrop-blur-md transition-all z-10"
                    >
                      <X size={20} />
                    </button>

                    <motion.img
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                      src={enlargedImage}
                      alt="Enlarged attachment"
                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-default"
                      onClick={(e) => e.stopPropagation()} 
                    />
                  </motion.div>
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