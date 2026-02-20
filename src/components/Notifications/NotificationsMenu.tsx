import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Calendar, MessageSquare, AlertCircle, CheckCheck, Trash2, CalendarClock, CalendarX2, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next'; //

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}

const DUMMY_NOTIFICATIONS = [
  { id: '9', type: 'system', title: 'Terms Updated', message: 'We have updated our terms of service and cancellation policy. Please read through these new changes carefully as they include important information regarding late cancellations, no-show fees, and refund processing times that will take effect starting next month.', time: 'Just now', isRead: false, actionRequired: false },
  { id: '1', type: 'cancellation', title: 'Lesson Cancelled', message: 'Sarah Jenkins cancelled tomorrow\'s 10:00 AM practical lesson.', time: '2h ago', isRead: false, actionRequired: true },
  { id: '2', type: 'reschedule', title: 'Reschedule Request', message: 'Mike Davis requested to move Thursday\'s lesson to Friday at 2:00 PM.', time: '5h ago', isRead: false, actionRequired: true },
  { id: '3', type: 'system', title: 'Package Status', message: 'You have 2 credits left in your package.', time: '1d ago', isRead: true, actionRequired: false },
  { id: '4', type: 'message', title: 'Short Message', message: 'Just a quick reminder to bring your updated provisional license tomorrow.', time: '1d ago', isRead: true, actionRequired: false },
  { id: '5', type: 'booking', title: 'Lesson Confirmed', message: 'Your lesson for next Monday at 9:00 AM has been confirmed by the instructor.', time: '2d ago', isRead: true, actionRequired: false },
  { id: '6', type: 'system', title: 'Payment Received', message: 'Your payment for the 10-hour automatic block package was successful. Credits have been added to your balance. You can view your updated balance in the packages tab.', time: '3d ago', isRead: true, actionRequired: false },
  { id: '7', type: 'cancellation', title: 'Weather Warning', message: 'Heavy snow expected tomorrow. Lessons may be subject to cancellation. Please check back later for updates.', time: '4d ago', isRead: true, actionRequired: false },
  { id: '8', type: 'message', title: 'Feedback Available', message: 'Your instructor has left detailed feedback for your previous mock test. Tap to review your progress.', time: '1w ago', isRead: true, actionRequired: false },
];

export function NotificationsMenu({ isOpen, onClose, isDark, buttonRef }: Props) {
  const { t } = useTranslation(); //
  const menuRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState(DUMMY_NOTIFICATIONS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

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
        setIsConfirmingClear(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose, buttonRef]);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const cardColor = isDark ? 'bg-slate border-gray-800' : 'bg-white border-gray-200';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const hoverBg = isDark ? 'hover:bg-white/5' : 'hover:bg-black/5';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          ref={menuRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }} 
          animate={{ opacity: 1, y: 0, scale: 1 }} 
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className={`absolute top-full right-[-10px] sm:-right-2 mt-3 w-80 sm:w-[340px] rounded-2xl border shadow-2xl overflow-hidden z-[100] origin-top-right flex flex-col max-h-[60vh] ${cardColor}`}
        >
          {/* Header */}
          <div className={`p-3 flex items-center justify-between border-b shrink-0 ${isDark ? 'border-gray-800 bg-midnight/50' : 'border-gray-100 bg-gray-50'}`}>
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
              {t('notifications.title', 'Notifications')} {unreadCount > 0 && <span className="text-primary ml-1">({unreadCount})</span>}
            </span>
            
            {notifications.length > 0 && (
              <div className="flex gap-2 items-center h-6">
                {isConfirmingClear ? (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2"
                  >
                    <span className="text-[10px] font-bold text-red-500 uppercase">{t('notifications.clearConfirm', 'Clear all?')}</span>
                    <button 
                      onClick={() => { setNotifications([]); setIsConfirmingClear(false); }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 transition-colors"
                    >
                      {t('common.yes', 'YES')}
                    </button>
                    <button 
                      onClick={() => setIsConfirmingClear(false)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${isDark ? 'text-gray-300 bg-gray-800 hover:bg-gray-700' : 'text-gray-600 bg-gray-200 hover:bg-gray-300'}`}
                    >
                      {t('common.no', 'NO')}
                    </button>
                  </motion.div>
                ) : (
                  <>
                    <button 
                      onClick={() => setNotifications(n => n.map(x => ({...x, isRead: true})))} 
                      className={`p-1 rounded transition-colors ${textMuted} ${hoverBg}`} 
                      title={t('notifications.markAllRead', 'Mark all read')}
                    >
                      <CheckCheck size={14} />
                    </button>
                    <button 
                      onClick={() => setIsConfirmingClear(true)} 
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
                      setNotifications={setNotifications}
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

function NotificationItem({ notif, expandedId, setExpandedId, setNotifications, isDark, textMuted }: any) {
  const { t } = useTranslation(); //
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(() => notif.message.length > 80);

  useLayoutEffect(() => {
    if (textRef.current) {
      setIsOverflowing(textRef.current.scrollHeight > 36);
    }
  }, [notif.message]);

  const hasActions = !!notif.actionRequired;
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
        setNotifications((n: any[]) => n.map(x => x.id === notif.id ? {...x, isRead: true} : x));
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
          <span className={`text-sm font-bold truncate ${notif.isRead ? textMuted : (isDark ? 'text-white' : 'text-gray-900')}`}>
            {notif.title}
          </span>
          
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-bold ${notif.isRead ? textMuted : 'text-primary'}`}>
              {notif.time}
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
          <p ref={textRef} className={`text-xs leading-[18px] m-0 p-0 ${textMuted}`}>
            {notif.message}
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