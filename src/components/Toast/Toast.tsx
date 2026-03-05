import { CheckCircle, XCircle, Info } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ToastMessage {
  id: number;
  msg: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps {
  toasts: ToastMessage[];
}

export function Toast({ toasts }: ToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    // Reduced the gap between stacked toasts slightly (gap-2 instead of gap-3)
    <div className="fixed top-6 inset-x-0 flex flex-col gap-2 items-center z-[10000] px-4 pointer-events-none">
      {/* --- THE FIX 2: Wrap the list in AnimatePresence --- */}
      <AnimatePresence>
        {toasts.map((toast) => {
          let glassStyle = '';
          if (toast.type === 'success') {
              glassStyle = 'bg-statusGreen/20 border-statusGreen/50 text-statusGreen shadow-[0_4px_30px_rgba(34,197,94,0.2)]';
          } else if (toast.type === 'error') {
              glassStyle = 'bg-statusRed/20 border-statusRed/50 text-red-400 shadow-[0_4px_30px_rgba(239,68,68,0.2)]';
          } else {
              glassStyle = 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_4px_30px_rgba(59,130,246,0.2)]'; 
          }

          return (
            // --- THE FIX 3: Change to motion.div and add animation states ---
            <motion.div 
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={`
                /* --- THE FIX 4: Thinner padding (px-5 py-2) --- */
                px-5 py-2 rounded-full flex items-center gap-2.5 pointer-events-auto 
                backdrop-blur-md border border-solid
                ${glassStyle}
              `}
            >
              {/* Shrunk the icons from size={20} to size={18} to match the thinner bar */}
              {toast.type === 'success' && <CheckCircle size={18} />}
              {toast.type === 'error' && <XCircle size={18} />}
              {toast.type === 'info' && <Info size={18} />}
              
              <span className="font-bold text-sm whitespace-nowrap">{toast.msg}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body
  );
}