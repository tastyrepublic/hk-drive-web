import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

// --- GLOBAL STATE ---
let openModalsCount = 0;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string; 
}

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = "max-w-lg" }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // --- SCROLL LOCK ---
  useEffect(() => {
    if (isOpen) {
      openModalsCount++;
      document.body.style.overflow = 'hidden';
    }
    return () => {
      if (isOpen) openModalsCount--;
      if (openModalsCount <= 0) {
        document.body.style.overflow = 'unset';
        openModalsCount = 0; 
      }
    };
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          
          {/* BACKDROP */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* MODAL CARD */}
          <motion.div
            layout // <--- 1. THIS ENABLE HEIGHT ANIMATION
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
            }}
            exit={{ opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.15 } }}
            transition={{ 
              type: "spring", // <--- 2. SMOOTH PHYSICS FOR RESIZING
              stiffness: 350, 
              damping: 30 
            }}
            className={`relative w-full ${maxWidth} bg-slate border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
            onClick={(e) => e.stopPropagation()} 
          >
            {/* HEADER (Fixed) */}
            <motion.div layout="position" className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-slate shrink-0">
              <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors -mr-2"
              >
                <X size={20} className="text-white/70" />
              </button>
            </motion.div>

            {/* CONTENT (Scrollable) */}
            <motion.div layout="position" className="p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
              {children}
            </motion.div>

            {/* FOOTER (Fixed) */}
            {footer && (
              <motion.div layout="position" className="p-4 border-t border-gray-800 bg-slate shrink-0">
                {footer}
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}