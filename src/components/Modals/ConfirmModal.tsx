import { useEffect, useState, useRef } from 'react';
import { Modal } from './Modal';
import { AlertTriangle, Loader2, Undo2, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  msg: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  confirmText?: string;
  isDestructive?: boolean;
}

export function ConfirmModal({ 
  isOpen, title, msg, onConfirm, onCancel, 
  isLoading = false, 
  confirmText = "Confirm", 
  isDestructive = true 
}: Props) {
  
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // NEW: Separate state for the smooth progress bar
  const [barWidth, setBarWidth] = useState(100);
  
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      setCountdown(null);
      setBarWidth(100); // Reset bar when modal opens
    } else {
      clearTimer();
    }
  }, [isOpen]);

  useEffect(() => {
    if (countdown === 0) {
      onConfirm();
      setCountdown(null);
    }
  }, [countdown]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCountdown(null);
    setBarWidth(100); // Snap bar back to full on clear
  };

  const handleStartCountdown = () => {
    setCountdown(3);
    setBarWidth(100); // Ensure it starts full

    // Trigger the smooth animation to 0% slightly after render
    setTimeout(() => {
        setBarWidth(0);
    }, 50);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleUndo = () => {
    clearTimer();
  };

  const isTimerActive = countdown !== null && countdown > 0;
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => { clearTimer(); onCancel(); }} 
      title="" 
      maxWidth="max-w-sm"
      isSaving={isLoading}
    >
      <div className="flex flex-col items-center text-center pt-2">
        
        {/* ICON */}
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDestructive ? 'bg-statusRed/10 text-statusRed' : 'bg-orange/10 text-orange'}`}>
          <AlertTriangle size={32} />
        </div>

        {/* TEXT */}
        <h3 className="text-xl font-black text-white mb-2">{title}</h3>
        <p className="text-sm text-textGrey leading-relaxed px-2 mb-8">
            {msg}
        </p>

        {/* BUTTONS */}
        <div className="flex gap-3 w-full">
          <button 
            onClick={() => { clearTimer(); onCancel(); }}
            disabled={isLoading || isTimerActive}
            className="flex-1 h-12 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-all disabled:opacity-50 border border-transparent hover:border-white/10 flex items-center justify-center"
          >
            Cancel
          </button>

          {!isTimerActive ? (
            /* STATE 1: INITIAL BUTTON */
            <button 
              onClick={handleStartCountdown}
              disabled={isLoading}
              className={`flex-1 h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
                isDestructive 
                  ? 'bg-statusRed hover:bg-statusRed/90 text-white' 
                  : 'bg-orange hover:bg-orange/90 text-white'
              }`}
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : (isDestructive ? <Trash2 size={18} /> : null)}
              {isLoading ? 'Processing...' : confirmText}
            </button>
          ) : (
            /* STATE 2: UNDO TIMER BUTTON */
            <button 
              onClick={handleUndo}
              className="flex-1 h-12 rounded-xl font-bold flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 transition-all relative overflow-hidden"
            >
              <div className="relative z-10 flex items-center gap-2">
                <Undo2 size={18} className="animate-pulse" /> 
                <span>Undo ({countdown}s)</span>
              </div>
              
              {/* Progress Bar Background */}
              <div 
                className="absolute bottom-0 left-0 h-1 bg-black/20 ease-linear"
                style={{ 
                    width: `${barWidth}%`,
                    // We force the transition to take exactly 3 seconds (3000ms) to hit 0
                    transition: 'width 3000ms linear' 
                }} 
              />
            </button>
          )}
        </div>
        
        {/* Helper Text */}
        <div className="h-6 mt-3 flex items-center justify-center">
            {isTimerActive && (
                <p className="text-[10px] text-textGrey/60 animate-pulse">
                    Action executes automatically in {countdown}s...
                </p>
            )}
        </div>
      </div>
    </Modal>
  );
}