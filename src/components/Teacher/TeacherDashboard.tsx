import { useState, useEffect, useMemo, useRef } from 'react';
import { db, auth } from '../../firebase'; 
import { signOut, type User } from 'firebase/auth';
import { 
  collection, query, where, onSnapshot, 
  doc, setDoc, getDoc, updateDoc, writeBatch 
} from 'firebase/firestore';
import { 
  LogOut, Sun, Moon, 
  Settings as SettingsIcon, Calendar, Users, CreditCard, 
  Menu, X, Bell, MessageSquare 
} from 'lucide-react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import { DiaryView } from '../Diary/DiaryView';
import { StudentsView } from '../Students/StudentsView';
import { PaymentsView } from '../Payments/PaymentsView';
import { SettingsView } from '../Settings/SettingsView';
import { EditLessonModal } from '../Modals/EditLessonModal';
import { StudentFormModal } from '../Modals/StudentFormModal';
import { ConfirmModal } from '../Modals/ConfirmModal';
import { NotificationsMenu } from '../Notifications/NotificationsMenu';
import { MessagesView } from '../Messages/MessagesView';
import { AutoFillModal } from '../Modals/AutoFillModal';

// Hooks
import { useLessonManager } from '../../hooks/useLessonManager';
import { useStudentManager } from '../../hooks/useStudentManager';
import { useNotifications } from '../../hooks/useNotifications';
import { useMessages } from '../../hooks/useMessages';
import { useHolidays } from '../../hooks/useHolidays';

import { DEFAULT_VEHICLE_ID } from '../../constants/list';
import { PAGE_VARIANTS, PAGE_TRANSITION } from '../../constants/animations';

type Tab = 'diary' | 'students' | 'messages' | 'payments' | 'settings';
type ToastType = 'success' | 'error';

interface LessonForm {
  id?: string;
  studentId?: string;
  date: string;
  time: string;
  location: string;
  type: string;
  endTime?: string;
  isDouble?: boolean;
  status?: 'Booked' | 'Blocked' | 'Open';
  customDuration?: number;
  examCenter?: string; 
}

interface Props {
  user: User;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  showToast: (msg: string, type?: ToastType) => void;
}

export function TeacherDashboard({ user, theme, toggleTheme, showToast }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const path = location.pathname;
  const activeTab = path.includes('/students') ? 'students' : 
                    path.includes('/payments') ? 'payments' : 
                    path.includes('/messages') ? 'messages' : 
                    path.includes('/settings') ? 'settings' : 'diary';

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false); 
  const notificationButtonRef = useRef<HTMLButtonElement>(null); 

  const { unreadCount: unreadNotifs } = useNotifications(); 
  const { unreadCount: unreadMessages } = useMessages(); 

  const [slots, setSlots] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  const [profile, setProfile] = useState<any>({ 
    name: '', phone: '', 
    lessonDuration: 45, defaultDoubleLesson: false, 
    bankName: '', accountNo: '', vehicleTypes: [],
    defaultExamCenters: []
  });
  const [, setOriginalProfile] = useState<any>({ 
    name: '', phone: '', lessonDuration: 45, defaultDoubleLesson: false, bankName: '', accountNo: '', vehicleTypes: [], defaultExamCenter: '' 
  });

  const [saveProfileLoading, setSaveProfileLoading] = useState(false);
  const [autoFillDate, setAutoFillDate] = useState<Date | null>(null);

  const holidays = useHolidays();
  
  const { 
    saveLesson, deleteLesson, autoScheduleWeek, copyWeekToNext, saveLoading: saveSlotLoading, validationMsg, setValidationMsg 
  } = useLessonManager(user, slots, profile, holidays);

  const {
    saveStudent, deleteStudent, updateBalance, sendInvite, cancelInvite, loading: saveStudentLoading 
  } = useStudentManager(user, students, showToast); 

  const [editingSlot, setEditingSlot] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<LessonForm>({ 
      date: '', time: '', location: '', type: DEFAULT_VEHICLE_ID, examCenter: '' 
  });

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentForm, setStudentForm] = useState({ 
      id: '', name: '', phone: '', vehicle: DEFAULT_VEHICLE_ID, examRoute: 'Not Assigned', balance: 10 
  });
  
  const [originalStudent, setOriginalStudent] = useState<any>(null);
  const [isEditingStudent, setIsEditingStudent] = useState(false);
  
  const [studentError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<any>(null);

  useEffect(() => {
    if (!user) return; 
    
    const unsubSlots = onSnapshot(query(collection(db, "slots"), where("teacherId", "==", user.uid)), (snap) => {
      // 1. DATA SANITIZATION AT THE BOUNDARY
      const loaded = snap.docs.map(d => {
        const data = d.data();
        return { 
            id: d.id, 
            ...data,
            time: data.time || "00:00",
            duration: data.duration || 60
        };
      });
      loaded.sort((a: any, b: any) => (a.date + a.time).localeCompare(b.date + b.time));
      setSlots(loaded);
    });

    const unsubStudents = onSnapshot(query(collection(db, "students"), where("teacherId", "==", user.uid)), (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    getDoc(doc(db, "instructors", user.uid)).then(snap => {
      if (snap.exists()) { 
        const data = snap.data();
        const safeProfile: any = { ...data, vehicleTypes: data.vehicleTypes || [] };
        if (!safeProfile.lessonDuration) safeProfile.lessonDuration = 45;
        if (safeProfile.defaultDoubleLesson === undefined) safeProfile.defaultDoubleLesson = false;
        setProfile(safeProfile); setOriginalProfile(safeProfile); 
        
        if (safeProfile.vehicleTypes && safeProfile.vehicleTypes.length > 0) {
            const preferredVehicle = safeProfile.vehicleTypes[0];
            setEditForm(prev => ({ ...prev, type: preferredVehicle }));
            setStudentForm(prev => ({ ...prev, vehicle: preferredVehicle }));
        }
      }
    });

    return () => { unsubSlots(); unsubStudents(); };
  }, [user]);

  const handleSetEditingSlot = (slotOrUpdate: any) => { 
    const slot = typeof slotOrUpdate === 'function' ? slotOrUpdate(editingSlot) : slotOrUpdate;
    setEditingSlot(slot); 
    if (!slot) { setValidationMsg(''); return; }

    const preferredVehicle = (profile?.vehicleTypes && profile.vehicleTypes.length > 0) ? profile.vehicleTypes[0] : DEFAULT_VEHICLE_ID;

    if (slot.id) {
        setEditForm({
            id: slot.id, studentId: slot.studentId || '', date: slot.date, time: slot.time, location: slot.location || '', 
            type: slot.type || '', isDouble: slot.isDouble || false, status: slot.status || 'Booked',
            customDuration: slot.customDuration || undefined, examCenter: slot.examCenter || '' 
        });
    } else {
        if (!slot.date) {
            setEditForm({
                date: '', time: '', location: '', type: preferredVehicle, studentId: '', isDouble: profile.defaultDoubleLesson ?? false,
                status: slot.status || 'Booked', customDuration: undefined, examCenter: '' 
            });
        } else {
            setEditForm(prev => ({
                ...prev, id: undefined, studentId: '', date: slot.date, time: slot.time, location: '', type: preferredVehicle,
                isDouble: profile.defaultDoubleLesson ?? false, status: slot.status || 'Booked', customDuration: undefined, examCenter: '' 
            }));
        }
    }
  };
  
  const isBlockMode = editForm.status === 'Blocked';
  const isFormValid = isBlockMode 
    ? (!!editForm.date && !!editForm.time && !!editForm.type) 
    : (!!editForm.date && !!editForm.time && !!editForm.location && !!editForm.type && !!editForm.examCenter); 

  const hasChanges = !editingSlot?.id ? true : ( 
      editForm.date !== editingSlot.date || editForm.time !== editingSlot.time || 
      (editForm.location || '') !== (editingSlot.location || '') || 
      (editForm.studentId || '') !== (editingSlot.studentId || '') || 
      (editForm.type || '') !== (editingSlot.type || '') || 
      (editForm.status || 'Booked') !== (editingSlot.status || 'Booked') || 
      (!!editForm.isDouble) !== (!!editingSlot.isDouble) || 
      (editForm.customDuration || 0) !== (editingSlot.customDuration || 0) ||
      (editForm.examCenter || '') !== (editingSlot.examCenter || '') 
  );

  const isSlotModified = isFormValid && hasChanges;
  const isStudentModified = isEditingStudent ? JSON.stringify(studentForm) !== JSON.stringify(originalStudent) : (studentForm.name.trim() !== '' && studentForm.phone.trim() !== '');

  const handlePublishDrafts = async () => {
    const draftSlots = slots.filter(s => s.status === 'Draft');
    if (draftSlots.length === 0) return;

    try {
      const batch = writeBatch(db);
      const studentsNotified = new Set(); 

      draftSlots.forEach(draft => {
        const slotRef = doc(db, "slots", draft.id);
        batch.update(slotRef, { status: 'Booked' });

        if (draft.studentId && draft.studentId !== 'Unknown' && !studentsNotified.has(draft.studentId)) {
          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
            userId: draft.studentId, type: 'system', title: 'New Lessons Scheduled',
            message: 'Your instructor has published new lessons to your schedule. Please check the app to view your upcoming driving slots!',
            isRead: false, createdAt: Date.now()
          });
          studentsNotified.add(draft.studentId);
        }
      });

      await batch.commit(); 
      showToast(`Successfully published ${draftSlots.length} lessons!`, 'success');
    } catch (error) {
      showToast("Error publishing schedule", 'error');
    }
  };

  const saveSlotEdit = async () => { 
    await saveLesson(
      editForm, editingSlot, 
      (successMsg: string) => { 
        setEditingSlot(null); setValidationMsg(''); 
        const preferredVehicle = (profile?.vehicleTypes && profile.vehicleTypes.length > 0) ? profile.vehicleTypes[0] : DEFAULT_VEHICLE_ID;
        setEditForm({ date: '', time: '', location: '', type: preferredVehicle, examCenter: '' }); 
        showToast(successMsg, 'success'); 
      }, 
      (errorMsg: string) => setValidationMsg(errorMsg)
    ); 
  };
  
  // 2. PROFESSIONAL DELETE HANDLER
  const handleDeleteSlotClick = (specificId?: string | React.MouseEvent) => { 
    const targetId = typeof specificId === 'string' ? specificId : editingSlot?.id;
    if (!targetId) return; 

    setConfirmDialog({ 
      isOpen: true, title: "Delete Lesson", msg: "Are you sure? This action cannot be undone.", 
      action: async () => { 
        await deleteLesson(
          targetId, 
          () => { 
            setEditingSlot(null); setValidationMsg(''); setConfirmDialog(null); 
            showToast("Lesson deleted successfully", "success"); 
          }, 
          (msg: string) => showToast(msg, "error")
        ); 
      } 
    }); 
  };

  const handleSaveStudent = async () => {
     await saveStudent(studentForm, isEditingStudent, () => { setIsStudentModalOpen(false); });
  };

  const handleDeleteStudentClick = () => { 
    if (!studentForm.id) return; 
    setConfirmDialog({ 
      isOpen: true, title: "Delete Student", 
      msg: `Warning: You are about to delete ${studentForm.name}. This will permanently remove their contact info, exam routes, and lesson history. Any remaining balance (${studentForm.balance} lessons) will be lost. This action cannot be undone.`, 
      action: async () => { 
          await deleteStudent(studentForm.id, () => { setIsStudentModalOpen(false); setConfirmDialog(null); });
      } 
    }); 
  };

  const handleUnlinkStudent = async (studentId: string) => {
    try {
        await updateDoc(doc(db, "students", studentId), { uid: null, inviteToken: null, claimedAt: null, inviteExpiresAt: null });
        showToast("Device unlinked. You can now send a new invite.", "success");
    } catch (e) {
        showToast("Failed to unlink.", "error");
    }
  };
  
  const saveProfile = async (profileOverride?: any) => { 
    if (!user) return; 
    setSaveProfileLoading(true); 
    try { 
      const dataToSave = { ...profile, ...(profileOverride || {}) }; 
      await setDoc(doc(db, "instructors", user.uid), dataToSave); 
      setProfile(dataToSave); setOriginalProfile({ ...dataToSave }); showToast("Profile updated"); 
    } catch (e) { 
      showToast("Error saving profile", 'error'); 
    } finally { 
      setSaveProfileLoading(false); 
    } 
  };

  const processedSlots = useMemo(() => { 
    const studentLookup = students.reduce((acc, student) => { acc[student.id] = student; return acc; }, {} as Record<string, any>); 
    return slots.map(slot => { 
      if (slot.studentId && slot.studentId !== 'Unknown') { 
        const student = studentLookup[slot.studentId]; 
        return { ...slot, studentName: student ? student.name : 'Unknown Student' }; 
      } 
      return slot; 
    }); 
  }, [slots, students]);

  // 3. OPTIMISTIC UI UPDATES
  const handleSlotMove = async (originalSlot: any, newDate: string, newTime: string, status: string) => {
    if (!user) return;
    
    // Capture the previous state in case we need to revert
    const previousSlots = [...slots];

    // Calculate the exact new end time to prevent the height from collapsing
    const durationMins = originalSlot.duration || (originalSlot.isDouble ? Number(profile?.lessonDuration) * 2 : Number(profile?.lessonDuration)) || 45;
    const [h, m] = newTime.split(':').map(Number);
    const totalMins = h * 60 + m + durationMins;
    const newEndTime = `${Math.floor(totalMins / 60).toString().padStart(2, '0')}:${(totalMins % 60).toString().padStart(2, '0')}`;

    // Optimistically update the UI instantly
    setSlots(prev => prev.map(slot => 
        slot.id === originalSlot.id 
          ? { ...slot, date: newDate, time: newTime, endTime: newEndTime, status: status || originalSlot.status } 
          : slot
    ));

    const updatedForm = { ...originalSlot, date: newDate, time: newTime, status: status || originalSlot.status };
    
    await saveLesson(
      updatedForm, originalSlot,
      (msg) => {
         // RESTORED TOAST NOTIFICATION
         showToast(msg, 'success');
      },
      (errorMsg) => {
         // Revert the state on error
         setSlots(previousSlots);
         showToast(`Failed to move: ${errorMsg}`, 'error');
      }
    );
  };

  return (
    <div className="min-h-screen bg-midnight text-white font-sans relative pb-20">
      
      <ConfirmModal 
        isOpen={!!confirmDialog?.isOpen} title={confirmDialog?.title || ''} msg={confirmDialog?.msg || ''} isLoading={saveSlotLoading || saveStudentLoading} 
        onConfirm={async () => { if (confirmDialog?.action) await confirmDialog.action(); }} onCancel={() => setConfirmDialog(null)}
      />

      <header className="bg-header border-b border-gray-800 sticky top-0 z-[60] shadow-sm w-full">
         <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 w-auto md:w-32 flex-shrink-0 justify-start">
                 <div className="bg-orange/10 p-2 rounded-lg border border-orange/20 flex-shrink-0 z-10 relative">
                    {activeTab === 'diary' && <Calendar className="text-orange" size={20} />}
                    {activeTab === 'students' && <Users className="text-orange" size={20} />}
                    {activeTab === 'messages' && <MessageSquare className="text-orange" size={20} />}
                    {activeTab === 'payments' && <CreditCard className="text-orange" size={20} />}
                    {activeTab === 'settings' && <SettingsIcon className="text-orange" size={20} />}
                 </div>
                 <div className={`overflow-hidden transition-all duration-500 ease-in-out flex flex-col justify-center ${"max-w-0 opacity-0 md:max-w-[150px] md:opacity-100"}`}>
                    <span className="capitalize font-bold text-white truncate pl-1 whitespace-nowrap">{activeTab}</span>
                 </div>
            </div>

            <nav className="flex bg-midnight rounded-lg p-1 border border-gray-800 z-10 relative">
                {(['diary', 'students', 'messages', 'payments'] as Tab[]).map(t => (
                  <button 
                    key={t} onClick={() => { if (activeTab !== t) navigate(`/dashboard/${t}`); }} 
                    className={`relative px-3 sm:px-6 py-1.5 rounded-md text-[11px] sm:text-sm font-bold capitalize transition-all ${activeTab === t ? 'bg-orange text-white shadow-sm' : 'text-textGrey hover:text-orange'}`}
                  >
                    {t}
                    {t === 'messages' && unreadMessages > 0 && <span className={`absolute top-1 right-2 w-2 h-2 bg-statusRed rounded-full shadow-[0_0_5px_rgba(239,68,68,0.5)]`} />}
                  </button>
                ))}
            </nav>

            <div className="flex items-center justify-end gap-1 sm:gap-2 w-auto flex-shrink-0 relative transition-all duration-500 ease-in-out">
                <button ref={notificationButtonRef} onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="p-2 rounded-lg text-textGrey hover-bg-theme transition-all duration-500 ease-in-out relative flex-shrink-0">
                    <Bell size={20} className="transition-all duration-500 ease-in-out" />
                    <AnimatePresence>
                        {unreadNotifs > 0 && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute top-1.5 right-1.5 w-2 h-2 bg-statusRed rounded-full border border-midnight shadow-[0_0_5px_rgba(239,68,68,0.5)] transition-all duration-500 ease-in-out" />}
                    </AnimatePresence>
                </button>

                <div className="flex items-center gap-1 sm:gap-2 overflow-hidden transition-all duration-500 ease-in-out max-w-0 md:max-w-[160px] opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto">
                   <button onClick={() => { if (activeTab !== 'settings') navigate('/dashboard/settings'); }} className={`p-2 rounded-lg transition-all duration-500 flex-shrink-0 ${activeTab === 'settings' ? 'text-orange bg-orange/10' : 'text-textGrey hover-bg-theme'}`}>
                     <SettingsIcon size={20} className="transition-all duration-500" />
                   </button>
                   <button onClick={toggleTheme} className="p-2 hover-bg-theme rounded-lg text-textGrey transition-all duration-500 flex-shrink-0">{theme === 'dark' ? <Sun size={20} className="transition-all duration-500" /> : <Moon size={20} className="transition-all duration-500" />}</button>
                   <button onClick={() => signOut(auth)} className="p-2 hover-bg-theme rounded-lg text-textGrey transition-all duration-500 flex-shrink-0"><LogOut size={20} className="transition-all duration-500" /></button>
                </div>
                
                <div className="flex items-center justify-end overflow-hidden transition-all duration-500 ease-in-out max-w-[50px] md:max-w-0 opacity-100 md:opacity-0 pointer-events-auto md:pointer-events-none">
                   <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 hover-bg-theme rounded-lg text-textGrey transition-colors flex-shrink-0">{isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}</button>
                </div>

                <NotificationsMenu isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} isDark={theme === 'dark'} buttonRef={notificationButtonRef} />

                {isMobileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsMobileMenuOpen(false)} />
                    <div className="absolute top-14 right-0 w-48 bg-slate border border-gray-800 rounded-xl shadow-2xl p-2 flex flex-col gap-1 z-50 md:hidden animate-in zoom-in-95 duration-200 origin-top-right">
                       <button onClick={() => { if (activeTab !== 'settings') navigate('/dashboard/settings'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === 'settings' ? 'text-orange bg-orange/10' : 'text-textGrey hover-bg-theme'}`}><SettingsIcon size={16} /> <span>Settings</span></button>
                       <button onClick={() => { toggleTheme(); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-bold text-textGrey hover-bg-theme transition-colors">{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span></button>
                       <div className="h-[1px] bg-gray-800/50 my-1 mx-2" />
                       <button onClick={() => signOut(auth)} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-bold text-statusRed hover:bg-statusRed/10 transition-colors"><LogOut size={16} /> <span>Log Out</span></button>
                    </div>
                  </>
                )}
            </div>
         </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 overflow-hidden relative">
        <AnimatePresence mode="wait">
            <motion.div key={activeTab} variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" transition={PAGE_TRANSITION}>
                <Routes location={location}>
                    <Route path="/" element={<Navigate to="/dashboard/diary" replace />} />
                    
                    <Route path="/diary" element={
                        <DiaryView 
                          slots={processedSlots} 
                          setEditingSlot={handleSetEditingSlot} 
                          lessonDuration={Number(profile?.lessonDuration) || 45} 
                          onPublishDrafts={handlePublishDrafts} 
                          onOpenAutoFill={(date) => setAutoFillDate(date)} 
                          onCopyWeek={copyWeekToNext}
                          onSlotMove={handleSlotMove}
                          showToast={showToast}
                          onDeleteSlot={(slot) => handleDeleteSlotClick(slot.id)}
                        />
                    } />
                    
                    <Route path="/students" element={
                        <StudentsView 
                            students={students} updateBalance={updateBalance} onSendInvite={sendInvite} 
                            openStudentModal={(stu: any) => { 
                                const preferredVehicle = (profile?.vehicleTypes && profile.vehicleTypes.length > 0) ? profile.vehicleTypes[0] : DEFAULT_VEHICLE_ID;
                                setStudentForm(stu || { id: '', name: '', phone: '', vehicle: preferredVehicle, examRoute: 'Not Assigned', balance: 10 }); 
                                setOriginalStudent(stu || null); setIsEditingStudent(!!stu); setIsStudentModalOpen(true); 
                            }} 
                        />
                    } />

                    <Route path="/messages" element={<MessagesView isDark={theme === 'dark'} students={students} />} />
                    <Route path="/payments" element={<PaymentsView studentCount={students.length} />} />
                    
                    <Route path="/settings/*" element={<SettingsView profile={profile} setProfile={setProfile} onSave={saveProfile} isLoading={saveProfileLoading} />} />
                    <Route path="*" element={<Navigate to="/dashboard/diary" replace />} />
                </Routes>
            </motion.div>
        </AnimatePresence>
      </main>

      <EditLessonModal 
        editingSlot={editingSlot} editForm={editForm} setEditForm={setEditForm} setEditingSlot={handleSetEditingSlot} 
        validationMsg={validationMsg} setValidationMsg={setValidationMsg} saveSlotLoading={saveSlotLoading} 
        isSlotModified={isSlotModified} onSave={saveSlotEdit} onDelete={handleDeleteSlotClick} 
        lessonDuration={Number(profile?.lessonDuration) || 45} defaultDoubleLesson={!!profile?.defaultDoubleLesson} 
        students={students} vehicleTypes={profile?.vehicleTypes && profile.vehicleTypes.length > 0 ? profile.vehicleTypes : []} 
      />
      
      <StudentFormModal 
        isOpen={isStudentModalOpen} setIsOpen={setIsStudentModalOpen} isEditing={isEditingStudent} 
        studentForm={studentForm} setStudentForm={setStudentForm} studentError={studentError} 
        saveStudentLoading={saveStudentLoading} isStudentModified={isStudentModified} onSave={handleSaveStudent} 
        onDelete={handleDeleteStudentClick} onSendInvite={sendInvite} onCancelInvite={cancelInvite} 
        onUnlink={handleUnlinkStudent} students={students} showToast={showToast} teacherVehicles={profile?.vehicleTypes || []}
      />

      <AutoFillModal
        isOpen={!!autoFillDate} onClose={() => setAutoFillDate(null)} isGenerating={saveSlotLoading}
        teacherVehicles={profile?.vehicleTypes || []} defaultDuration={Number(profile?.lessonDuration) || 45} defaultDouble={!!profile?.defaultDoubleLesson}          
        teacherExamCenters={profile?.defaultExamCenters || []}
        onGenerate={async (config) => {
            if (autoFillDate) {
                await autoScheduleWeek(autoFillDate, config, (msg) => { showToast(msg, 'success'); setAutoFillDate(null); }, (msg) => showToast(msg, 'error'));
            }
        }}
      />
    </div>
  );
}