import { CheckCircle, XCircle, Info } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

interface ToastProps {
  msg: string;
  type: 'success' | 'error' | 'info'; 
  onClose?: () => void; 
}

export function Toast({ msg, type }: ToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  // --- THE FIX: Apply semi-transparent backgrounds and matching text colors ---
  let glassStyle = '';
  if (type === 'success') {
      glassStyle = 'bg-statusGreen/20 border-statusGreen/50 text-statusGreen shadow-[0_4px_30px_rgba(34,197,94,0.2)]';
  } else if (type === 'error') {
      glassStyle = 'bg-statusRed/20 border-statusRed/50 text-red-400 shadow-[0_4px_30px_rgba(239,68,68,0.2)]';
  } else {
      glassStyle = 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_4px_30px_rgba(59,130,246,0.2)]'; 
  }

  return createPortal(
    <div className="fixed top-6 inset-x-0 flex justify-center z-[10000] px-4 pointer-events-none">
      <div className={`
        px-6 py-3 rounded-full flex items-center gap-3 pointer-events-auto 
        animate-in fade-in slide-in-from-top-8 duration-500 zoom-in-95 
        [animation-timing-function:cubic-bezier(0.34,1.56,0.64,1)]
        /* --- THE FIX: The core Glassmorphism utilities --- */
        backdrop-blur-md border border-solid
        ${glassStyle}
      `}>
        {type === 'success' && <CheckCircle size={20} />}
        {type === 'error' && <XCircle size={20} />}
        {type === 'info' && <Info size={20} />}
        
        <span className="font-bold text-sm whitespace-nowrap">{msg}</span>
      </div>
    </div>,
    document.body
  );
}