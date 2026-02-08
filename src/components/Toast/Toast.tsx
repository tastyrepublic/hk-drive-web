import { CheckCircle, XCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

interface ToastProps {
  msg: string;
  type: 'success' | 'error';
  onClose?: () => void; // Optional: if you want to allow clicking to close
}

export function Toast({ msg, type }: ToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    // z-[10000] puts this strictly ABOVE the Modal (which is z-[9999])
    <div className="fixed top-6 inset-x-0 flex justify-center z-[10000] px-4 pointer-events-none">
      <div className={`
        px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 pointer-events-auto 
        animate-in fade-in slide-in-from-top-8 duration-500 zoom-in-95 
        [animation-timing-function:cubic-bezier(0.34,1.56,0.64,1)]
        ${type === 'success' ? 'bg-statusGreen text-black' : 'bg-statusRed text-white'}
      `}>
        {type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
        <span className="font-bold text-sm whitespace-nowrap">{msg}</span>
      </div>
    </div>,
    document.body
  );
}