import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from './Modal'; // Importing your new base component

interface Props {
  isOpen: boolean;
  title: string;
  msg: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmModal({ isOpen, title, msg, onConfirm, onCancel, isLoading }: Props) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel} // Clicking backdrop or X closes it
      title={title}      // Title now appears in the neat header bar
      maxWidth="max-w-sm" // Keeps it compact like before
    >
      <div className="flex flex-col items-center text-center">
        
        {/* ICON - Centered & Red */}
        <div className="w-16 h-16 bg-statusRed/10 text-statusRed rounded-full flex items-center justify-center mb-4">
          <AlertTriangle size={32} />
        </div>

        {/* MESSAGE */}
        <p className="text-textGrey mb-8 text-sm leading-relaxed">
          {msg}
        </p>

        {/* ACTION BUTTONS */}
        <div className="flex gap-3 w-full">
          <button 
            onClick={onCancel} 
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-700 text-white font-bold hover-bg-theme transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          
          <button 
            onClick={onConfirm} 
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-statusRed text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-lg flex justify-center items-center gap-2 disabled:opacity-50 min-h-[52px]"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              "Confirm"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}