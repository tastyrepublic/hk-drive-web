import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ChatBox } from '../Messages/ChatBox';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeChatId: string; // <-- 1. ADDED explicitly
  receiverId: string;   // <-- 2. Renamed to be universal
  receiverName: string; // <-- 3. Renamed to be universal
  isDark: boolean;
}

export function QuickChatModal({ isOpen, onClose, activeChatId, receiverId, receiverName, isDark }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            layout
            layoutDependency={[isOpen, activeChatId]}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-lg h-[80vh] max-h-[700px] flex flex-col shadow-2xl z-10 rounded-xl overflow-hidden bg-transparent"
          >
            <button 
              onClick={onClose}
              className={`absolute top-4 right-4 p-1 rounded-lg z-20 transition-colors ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
            >
              <X size={20} />
            </button>

            <ChatBox 
              activeChatId={activeChatId}
              receiverId={receiverId}
              receiverName={receiverName}
              isDark={isDark}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}