import { CheckCircle, XCircle, Info } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

interface ToastProps {
  msg: string;
  type: 'success' | 'error' | 'info'; // <-- [NEW] Added 'info'
  onClose?: () => void; 
}

export function Toast({ msg, type }: ToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  // [NEW] Determine the background color based on the type
  let bgColor = '';
  if (type === 'success') bgColor = 'bg-statusGreen text-black';
  else if (type === 'error') bgColor = 'bg-statusRed text-white';
  else bgColor = 'bg-blue-500 text-white'; // Soft blue for info

  return createPortal(
    <div className="fixed top-6 inset-x-0 flex justify-center z-[10000] px-4 pointer-events-none">
      <div className={`
        px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 pointer-events-auto 
        animate-in fade-in slide-in-from-top-8 duration-500 zoom-in-95 
        [animation-timing-function:cubic-bezier(0.34,1.56,0.64,1)]
        ${bgColor}
      `}>
        {/* [NEW] Render the correct icon */}
        {type === 'success' && <CheckCircle size={20} />}
        {type === 'error' && <XCircle size={20} />}
        {type === 'info' && <Info size={20} />}
        
        <span className="font-bold text-sm whitespace-nowrap">{msg}</span>
      </div>
    </div>,
    document.body
  );
}