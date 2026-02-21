import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Calendar, MessageSquare, AlertCircle, CheckCheck, Trash2, CalendarClock, CalendarX2, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../hooks/useNotifications';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}

const getTimeAgo = (timestamp: number) => {
  if (!timestamp) return 'Just now';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export function NotificationsMenu({ isOpen, onClose, isDark, buttonRef }: Props) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [confirmAction, setConfirmAction] = useState<'clear' | 'read' | null>(null);

  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAllNotifications } = useNotifications();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        isOpen && 
        menuRef.current && 
        !menuRef.current.contains(target) && 
        buttonRef.current && 
        !buttonRef.current.contains(target)
      ) {
        onClose();
        setExpandedId(null);
        setConfirmAction(null); 
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose, buttonRef]);

  const cardColor = isDark ? 'bg-slate border-gray-800' : 'bg-white border-gray-200';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          ref={menuRef}
          initial={{ opacity: 0, x: 15 }} 
          animate={{ opacity: 1, x: 0 }} 
          exit={{ opacity: 0, x: 15 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={`absolute top-full right-0 mt-3 w-80 sm:w-[340px] rounded-2xl border shadow-2xl overflow-hidden z-[100] origin-top-right flex flex-col max-h-[60vh] ${cardColor}`}
        >
          {/* Header */}
          <div className={`p-3 flex items-center justify-between border-b shrink-0 ${isDark ? 'border-gray-800 bg-midnight/50' : 'border-gray-100 bg-gray-50'}`}>
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
              {t('notifications.title', 'Notifications')} {unreadCount > 0 && <span className="text-primary ml-1">({unreadCount})</span>}
            </span>
            
            {notifications.length > 0 && (
              <div className="flex gap-2 items-center h-6">
                {confirmAction ? (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2"
                  >
                    <span className={`text-[10px] font-bold uppercase ${confirmAction === 'clear' ? 'text-red-500' : 'text-primary'}`}>
                      {confirmAction === 'clear' ? t('notifications.clearConfirm', 'Clear all?') : t('notifications.readConfirm', 'Read all?')}
                    </span>
                    <button 
                      onClick={() => { 
                        if (confirmAction === 'clear') clearAllNotifications();
                        if (confirmAction === 'read') markAllAsRead();
                        setConfirmAction(null); 
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold text-white transition-colors ${confirmAction === 'clear' ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'}`}
                    >
                      {t('common.yes', 'YES')}
                    </button>
                    <button 
                      onClick={() => setConfirmAction(null)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${isDark ? 'text-gray-300 bg-gray-800 hover:bg-gray-700' : 'text-gray-600 bg-gray-200 hover:bg-gray-300'}`}
                    >
                      {t('common.no', 'NO')}
                    </button>
                  </motion.div>
                ) : (
                  <>
                    {unreadCount > 0 && (
                      <button 
                        onClick={() => setConfirmAction('read')}
                        className={`p-1 rounded transition-colors ${textMuted} hover:text-primary hover:bg-primary/10`} 
                        title={t('notifications.markAllRead', 'Mark all read')}
                      >
                        <CheckCheck size={14} />
                      </button>
                    )}
                    <button 
                      onClick={() => setConfirmAction('clear')} 
                      className={`p-1 rounded transition-colors ${textMuted} hover:text-red-500 hover:bg-red-500/10`} 
                      title={t('notifications.clearAll', 'Clear all')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="overflow-y-auto custom-scrollbar flex-1 pb-2">
            <AnimatePresence initial={false}>
              {notifications.length > 0 ? (
                notifications.map(notif => (
                  <motion.div
                    key={notif.id}
                    layout="position"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={`overflow-hidden border-b last:border-0 ${isDark ? 'border-gray-800/50' : 'border-gray-100/50'}`}
                  >
                    <NotificationItem 
                      notif={notif}
                      expandedId={expandedId}
                      setExpandedId={setExpandedId}
                      markAsRead={markAsRead}
                      isDark={isDark}
                      textMuted={textMuted}
                    />
                  </motion.div>
                ))
              ) : (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="py-8 text-center flex flex-col items-center gap-2">
                    <Bell size={24} className={textMuted} opacity={0.3} />
                    <span className={`text-xs font-bold ${textMuted}`}>{t('notifications.emptyState', 'No new notifications')}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NotificationItem({ notif, expandedId, setExpandedId, markAsRead, isDark, textMuted }: any) {
  const { t } = useTranslation();
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(() => (notif.message || '').length > 80);

  useLayoutEffect(() => {
    if (textRef.current) {
      setIsOverflowing(textRef.current.scrollHeight > 36);
    }
  }, [notif.message]);

  const hasActions = notif.type === 'cancellation' || notif.type === 'reschedule';
  const useMask = isOverflowing && !hasActions;
  const isExpandable = useMask || hasActions;
  const isExpanded = expandedId === notif.id;

  const getIcon = (type: string) => {
    switch (type) {
      case 'cancellation': return <CalendarX2 size={16} />;
      case 'reschedule': return <CalendarClock size={16} />;
      case 'booking': return <Calendar size={16} />;
      case 'message': return <MessageSquare size={16} />;
      case 'system': return <AlertCircle size={16} />;
      default: return <Bell size={16} />;
    }
  };

  const getIconColor = (type: string, isRead: boolean) => {
    if (isRead) return isDark ? 'text-gray-500 bg-gray-800' : 'text-gray-400 bg-gray-100';
    switch (type) {
      case 'cancellation': return 'text-red-500 bg-red-500/10';
      case 'reschedule': return 'text-orange-500 bg-orange-500/10';
      case 'booking': return 'text-primary bg-primary/10';
      case 'message': return 'text-green-500 bg-green-500/10';
      case 'system': return 'text-primary bg-primary/10';
      default: return 'text-primary bg-primary/10';
    }
  };

  return (
    <div 
      onClick={() => {
        if (!notif.isRead) markAsRead(notif.id);
        if (isExpandable) {
          setExpandedId(isExpanded ? null : notif.id);
        }
      }}
      className={`p-3 flex items-start gap-3 transition-colors group relative
        ${isExpandable ? 'cursor-pointer' : 'cursor-default'}
        ${notif.isRead 
          ? (isDark ? 'hover:bg-white/5 opacity-70' : 'hover:bg-black/5 opacity-70')
          : (isDark ? 'bg-primary/5 hover:bg-primary/10' : 'bg-primary/5 hover:bg-primary/10')}
      `}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${getIconColor(notif.type, notif.isRead)}`}>
        {getIcon(notif.type)}
      </div>
      
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          {/* FIXED: Explicitly cast to string and pass the raw DB text as defaultValue */}
          <span className={`text-sm font-bold truncate ${notif.isRead ? textMuted : (isDark ? 'text-white' : 'text-gray-900')}`}>
            {t(notif.titleKey || notif.title, { defaultValue: notif.title }) as string}
          </span>
          
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-bold ${notif.isRead ? textMuted : 'text-primary'}`}>
              {getTimeAgo(notif.createdAt)}
            </span>
            <div className="w-[14px] flex justify-center items-center">
              {isExpandable && (
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={textMuted}
                >
                  <ChevronDown size={14} />
                </motion.div>
              )}
            </div>
          </div>
        </div>
        
        <motion.div
          initial={false}
          animate={{ height: useMask && !isExpanded ? 36 : 'auto' }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={useMask ? "overflow-hidden" : ""}
          style={{
            WebkitMaskImage: useMask && !isExpanded ? 'linear-gradient(to bottom, black 50%, transparent 100%)' : 'none',
            maskImage: useMask && !isExpanded ? 'linear-gradient(to bottom, black 50%, transparent 100%)' : 'none'
          }}
        >
          {/* FIXED: Combine params and defaultValue securely, then cast to string */}
          <p ref={textRef} className={`text-xs leading-[18px] m-0 p-0 ${textMuted}`}>
            {t(notif.messageKey || notif.message, { ...(notif.messageParams || {}), defaultValue: notif.message }) as string}
          </p>
        </motion.div>

        <AnimatePresence initial={false}>
          {isExpanded && hasActions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className={`mt-3 pt-3 flex gap-2 border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                <button 
                  className="flex-1 rounded bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:bg-primary/90"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {t('notifications.reviewRequest', 'Review Request')}
                </button>
                <button 
                  className={`flex-1 rounded px-3 py-1.5 text-xs font-bold transition ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedId(null);
                  }}
                >
                  {t('notifications.dismiss', 'Dismiss')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}