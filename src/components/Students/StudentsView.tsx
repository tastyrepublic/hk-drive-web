// 1. ADDED: useState
import { auth } from '../../firebase';
import { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { StudentCard } from './StudentCard';
// 2. ADDED: Import the new modal
import { QuickChatModal } from '../Modals/QuickChatModal';

interface Props {
  students: any[];
  updateBalance: (id: string, newBalance: number) => void;
  openStudentModal: (stu?: any) => void;
  onSendInvite: (student: any) => void; 
  // 3. ADDED: isDark prop so the chat box matches your theme
  isDark?: boolean; 
}

export function StudentsView({ students, updateBalance, openStudentModal, onSendInvite, isDark = true }: Props) {
  // 4. ADDED: State to control the floating chat window
  const [chatStudent, setChatStudent] = useState<any | null>(null);

  return (
    <div className="space-y-6 transition-all duration-300"> 
      <div className="flex justify-end">
        <button 
          onClick={() => openStudentModal()} 
          className="flex items-center gap-2 bg-orange hover:brightness-110 text-white px-4 py-2 rounded-lg font-bold transition shadow-lg active:scale-95"
        >
          <Plus size={20} /> Add Student
        </button>
      </div>
      
      {students && students.length > 0 ? (
        <div className="grid gap-4">
          {students.map((stu: any) => (
            <StudentCard 
              key={stu.id} 
              stu={stu} 
              updateBalance={updateBalance} 
              openStudentModal={openStudentModal} 
              onSendInvite={onSendInvite} 
              // 5. ADDED: Pass the trigger down to the card
              onOpenChat={() => setChatStudent(stu)} 
            />
          ))}
        </div>
      ) : (
        <div className="bg-slate rounded-2xl p-12 text-center border border-gray-800 animate-in fade-in zoom-in-[0.98] duration-300 transition-colors">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-midnight rounded-full mb-4 border border-gray-800 transition-colors duration-300">
            <Users size={28} className="text-textGrey opacity-40" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Students Yet</h3>
          <p className="text-textGrey max-w-xs mx-auto text-sm leading-relaxed mb-8">
            Start by adding a student to manage their lessons, exam routes, and package balances.
          </p>
          <button 
            onClick={() => openStudentModal()}
            className="inline-flex items-center gap-2 bg-orange/10 hover:bg-orange/20 text-orange px-6 py-2 rounded-xl font-bold transition-all active:scale-95"
          >
            <Plus size={18} /> Add Your First Student
          </button>
        </div>
      )}

      {/* 6. ADDED: The Modal Component at the bottom of the view */}
      <QuickChatModal 
        isOpen={!!chatStudent}
        onClose={() => setChatStudent(null)}
        // Force it to use the Teacher UID + Student Profile ID
        activeChatId={chatStudent && auth.currentUser ? [auth.currentUser.uid, chatStudent.id].sort().join('_') : ''}
        receiverId={chatStudent?.id || ''}
        receiverName={chatStudent?.name || ''}
        isDark={!!isDark}
      />
    </div>
  );
}