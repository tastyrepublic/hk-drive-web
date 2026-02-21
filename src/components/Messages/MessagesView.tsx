import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMessages } from '../../hooks/useMessages';
import { ChatBox } from './ChatBox';
import { auth } from '../../firebase';

interface Props {
  isDark: boolean;
  students: any[]; // <-- ADDED: Now it receives the students array directly!
}

export function MessagesView({ isDark, students }: Props) {
  const { t } = useTranslation();
  const { messages } = useMessages(); 

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter((s: any) => s.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [students, searchQuery]);

  const selectedStudent = students?.find((s: any) => s.id === selectedStudentId);
  
  const activeChatId = selectedStudent && auth.currentUser 
    ? [auth.currentUser.uid, selectedStudent.id].sort().join('_') 
    : undefined;

  const bgTheme = isDark ? 'bg-slate border-gray-800' : 'bg-white border-gray-200';
  const hoverTheme = isDark ? 'hover:bg-white/5' : 'hover:bg-black/5';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="w-full flex flex-col h-[calc(100vh-130px)]">
      <div className="flex-1 flex gap-4 sm:gap-6 overflow-hidden">
        
        {/* LEFT PANEL: Student List */}
        <div className={`w-full sm:w-80 flex flex-col rounded-xl border shrink-0 shadow-sm ${bgTheme} ${selectedStudentId ? 'hidden sm:flex' : 'flex'}`}>
           <div className={`p-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
             <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border focus-within:ring-1 focus-within:ring-primary transition-all ${isDark ? 'bg-midnight border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <Search size={16} className={textMuted} />
                <input 
                  type="text" 
                  placeholder={t('chat.searchStudents', 'Search students...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-full text-current"
                />
             </div>
           </div>
           
           <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {filteredStudents.map((student: any) => {
                 const chatId = auth.currentUser ? [auth.currentUser.uid, student.id].sort().join('_') : '';
                 const hasUnread = messages.some(m => m.chatId === chatId && !m.isRead && m.receiverId === auth.currentUser?.uid);
                 const isSelected = selectedStudentId === student.id;

                 return (
                   <button
                     key={student.id}
                     onClick={() => setSelectedStudentId(student.id)}
                     className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${isSelected ? (isDark ? 'bg-primary/20' : 'bg-primary/10') : hoverTheme}`}
                   >
                     <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0 relative">
                        {student.name ? student.name.charAt(0).toUpperCase() : '?'}
                        {hasUnread && (
                          <span className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-statusRed rounded-full border-2 ${isDark ? 'border-slate' : 'border-white'}`} />
                        )}
                     </div>
                     <div className="flex-1 min-w-0">
                       <h3 className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{student.name || 'Unknown Student'}</h3>
                     </div>
                   </button>
                 );
              })}
           </div>
        </div>

        {/* RIGHT PANEL: Chat Box */}
        <div className={`flex-1 shadow-sm ${!selectedStudentId ? 'hidden sm:block' : 'block'}`}>
           {selectedStudentId && selectedStudent ? (
             <ChatBox 
               activeChatId={activeChatId}
               receiverId={selectedStudent.id}
               receiverName={selectedStudent.name || 'Student'}
               isDark={isDark}
               onBack={() => setSelectedStudentId(null)}
             />
           ) : (
             <ChatBox 
               activeChatId={undefined}
               receiverId=""
               receiverName=""
               isDark={isDark}
             />
           )}
        </div>
      </div>
    </div>
  );
}