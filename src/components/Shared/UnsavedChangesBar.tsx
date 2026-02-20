import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface Props {
  show: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
  variant?: 'teacher' | 'student';
}

export function UnsavedChangesBar({ show, onKeepEditing, onDiscard, variant = 'teacher' }: Props) {
  const isStudent = variant === 'student';
  
  const borderColor = isStudent ? 'border-primary/30' : 'border-orange/30';
  const textColor = isStudent ? 'text-primary' : 'text-orange';
  const btnColor = isStudent ? 'bg-primary' : 'bg-orange';
  const shadowGlow = isStudent ? 'shadow-primary/20' : 'shadow-orange/20';
  
  const containerGlow = isStudent 
    ? 'shadow-[0_10px_40px_rgba(59,130,246,0.15)]' 
    : 'shadow-[0_10px_40px_rgba(249,115,22,0.15)]'; 

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          // --- FIX: Added opacity: 0 to initial and exit ---
          initial={{ y: '-100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={`fixed top-0 left-0 right-0 z-[10000] bg-midnight border-b ${borderColor} ${containerGlow}`}
        >
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between p-4 px-6 gap-3">
            <div className="flex items-center gap-2 font-bold text-sm text-white">
              <AlertTriangle size={18} className={textColor} />
              <span>You have unsaved changes.</span>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={onKeepEditing} 
                className="flex-1 sm:flex-none px-4 py-2 bg-white/5 hover:bg-white/10 text-textGrey hover:text-white border border-gray-800 rounded-lg text-xs font-bold transition-colors active:scale-95"
              >
                Keep Editing
              </button>
              <button 
                onClick={onDiscard} 
                className={`flex-1 sm:flex-none px-4 py-2 ${btnColor} hover:brightness-110 text-white rounded-lg text-xs font-bold transition-all shadow-lg ${shadowGlow} active:scale-95`}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}