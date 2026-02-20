import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react"; 
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useEffect, useState, useRef } from "react";
import { UnsavedChangesBar } from "../Shared/UnsavedChangesBar";

// --- GLOBAL STATE ---
let openModalsCount = 0;
let originalPaddingRight = '';
let isProgrammaticBack = false;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string; 
  isSaving?: boolean;
  isModified?: boolean;
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer, 
  maxWidth = "max-w-lg",
  isSaving = false,
  isModified = false 
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  
  const latestProps = useRef({ isSaving, isModified, onClose });
  const closedViaRouterRef = useRef(false);

  useEffect(() => {
    latestProps.current = { isSaving, isModified, onClose };
  }, [isSaving, isModified, onClose]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
      if (isOpen) setShowWarning(false);
  }, [isOpen]);

  // --- AUTO-DISMISS WARNING BAR ---
  useEffect(() => {
      if (!isModified && showWarning) {
          setShowWarning(false);
      }
  }, [isModified, showWarning]);

  // --- EXTERNAL PROTECTION: TAB CLOSE & REFRESH ---
  useEffect(() => {
      // Only protect if the modal is open AND has unsaved changes
      if (!isOpen || !isModified) return;

      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
          e.preventDefault();
          // Setting returnValue to any string triggers the browser's native warning dialog
          e.returnValue = ''; 
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      
      // Clean up the listener when the modal closes or changes are saved
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isOpen, isModified]);

  // --- BULLETPROOF SCROLL LOCK & SHIFT PREVENTION ---
  useEffect(() => {
    if (isOpen) {
      if (openModalsCount === 0) {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        originalPaddingRight = document.body.style.paddingRight;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      openModalsCount++;
      
      return () => {
        openModalsCount--;
        if (openModalsCount <= 0) {
          document.documentElement.style.overflow = '';
          document.body.style.overflow = '';
          document.body.style.paddingRight = originalPaddingRight; 
          openModalsCount = 0; 
        }
      };
    }
  }, [isOpen]);

  // --- BACK BUTTON HIJACKER ---
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ modalOpen: true }, '');

    const handlePopState = () => {
        if (isProgrammaticBack) return;

        const { isSaving: currentSaving, isModified: currentModified, onClose: currentClose } = latestProps.current;

        if (currentSaving) {
            window.history.pushState({ modalOpen: true }, '');
            return;
        }

        if (currentModified) {
            window.history.pushState({ modalOpen: true }, '');
            setShowWarning(true);
        } else {
            closedViaRouterRef.current = true;
            currentClose();
        }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
        window.removeEventListener('popstate', handlePopState);
        
        if (!closedViaRouterRef.current && window.history.state?.modalOpen) {
            isProgrammaticBack = true;
            window.history.back();
            setTimeout(() => { isProgrammaticBack = false; }, 100);
        }
        closedViaRouterRef.current = false;
    };
  }, [isOpen]);

  const handleAttemptClose = () => {
      if (isSaving) return;
      if (isModified) {
          setShowWarning(true);
      } else {
          onClose();
      }
  };

  const handleForceClose = () => {
      setShowWarning(false);
      onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <UnsavedChangesBar 
          show={showWarning} 
          onKeepEditing={() => setShowWarning(false)} 
          onDiscard={handleForceClose} 
      />

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleAttemptClose}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              layout 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className={`relative w-full ${maxWidth} bg-slate border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
              onClick={(e) => e.stopPropagation()} 
            >
              <motion.div layout="position" className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-slate shrink-0 relative z-20">
                <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
                <button
                  onClick={handleAttemptClose}
                  disabled={isSaving}
                  className={`p-2 rounded-full transition-colors -mr-2 ${isSaving ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10'}`}
                >
                  <X size={20} className="text-white/70" />
                </button>
              </motion.div>

              <motion.div layout="position" className="p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0 relative z-0">
                {children}
              </motion.div>

              {footer && (
                <motion.div layout="position" className="p-4 border-t border-gray-800 bg-slate shrink-0">
                  {footer}
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}