import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../../firebase'; 
import { signOut, type User } from 'firebase/auth';
import { 
  collection, query, where, onSnapshot, 
  doc, setDoc, getDoc, updateDoc 
} from 'firebase/firestore';
import { 
  LogOut, Sun, Moon, 
  Settings as SettingsIcon, Calendar, Users, CreditCard, 
  Menu, X 
} from 'lucide-react';

// Components
import { DiaryView } from '../Diary/DiaryView';
import { StudentsView } from '../Students/StudentsView';
import { PaymentsView } from '../Payments/PaymentsView';
import { SettingsView } from '../Settings/SettingsView';
import { EditLessonModal } from '../Modals/EditLessonModal';
import { StudentFormModal } from '../Modals/StudentFormModal';
import { ConfirmModal } from '../Modals/ConfirmModal';

// Hooks
import { useLessonManager } from '../../hooks/useLessonManager';
import { useStudentManager } from '../../hooks/useStudentManager';

import { DEFAULT_VEHICLE_ID } from '../../constants/list';

// --- TYPES ---
type Tab = 'diary' | 'students' | 'payments' | 'settings';
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
}

interface Props {
  user: User;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  showToast: (msg: string, type?: ToastType) => void;
}

export function TeacherDashboard({ user, theme, toggleTheme, showToast }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('diary');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // STATE: DATA
  const [slots, setSlots] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  const [profile, setProfile] = useState<any>({ 
    name: '', phone: '', 
    lessonDuration: 45, defaultDoubleLesson: false, 
    bankName: '', accountNo: '', vehicleTypes: []
  });
  const [, setOriginalProfile] = useState<any>({ 
    name: '', phone: '', lessonDuration: 45, defaultDoubleLesson: false, bankName: '', accountNo: '', vehicleTypes: [] 
  });

  const [saveProfileLoading, setSaveProfileLoading] = useState(false);

  // --- HOOKS ---
  const { 
    saveLesson, deleteLesson, saveLoading: saveSlotLoading, validationMsg, setValidationMsg 
  } = useLessonManager(user, slots, profile);

  const {
    saveStudent, 
    deleteStudent, 
    updateBalance, 
    sendInvite,
    cancelInvite, 
    loading: saveStudentLoading 
  } = useStudentManager(user, students, showToast); 

  // --- UI STATE ---
  const [editingSlot, setEditingSlot] = useState<any | null>(null);
  
  const [editForm, setEditForm] = useState<LessonForm>({ 
      date: '', 
      time: '', 
      location: '', 
      type: DEFAULT_VEHICLE_ID 
  });

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  
  const [studentForm, setStudentForm] = useState({ 
      id: '', 
      name: '', 
      phone: '', 
      vehicle: DEFAULT_VEHICLE_ID, 
      examRoute: 'Not Assigned', 
      balance: 10 
  });
  
  const [originalStudent, setOriginalStudent] = useState<any>(null);
  const [isEditingStudent, setIsEditingStudent] = useState(false);
  
  const [studentError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<any>(null);

  // --- DATA SYNC ---
  useEffect(() => {
    if (!user) return; 
    
    // 1. Slots Listener
    const unsubSlots = onSnapshot(query(collection(db, "slots"), where("teacherId", "==", user.uid)), (snap) => {
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      loaded.sort((a: any, b: any) => (a.date + a.time).localeCompare(b.date + b.time));
      setSlots(loaded);
    });

    // 2. Students Listener
    const unsubStudents = onSnapshot(query(collection(db, "students"), where("teacherId", "==", user.uid)), (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 3. Profile Fetch & FORM INITIALIZATION
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

  // --- CENTRALIZED EDIT FORM HANDLER ---
  const handleSetEditingSlot = (slotOrUpdate: any) => { 
    const slot = typeof slotOrUpdate === 'function' 
        ? slotOrUpdate(editingSlot) 
        : slotOrUpdate;

    setEditingSlot(slot); 
    
    if (!slot) {
        setValidationMsg('');
        return;
    }

    const preferredVehicle = (profile?.vehicleTypes && profile.vehicleTypes.length > 0) 
        ? profile.vehicleTypes[0] 
        : DEFAULT_VEHICLE_ID;

    if (slot.id) {
        // --- A. EDITING EXISTING SLOT ---
        setEditForm({
            id: slot.id,
            studentId: slot.studentId || '',
            date: slot.date,
            time: slot.time,
            location: slot.location || '', 
            type: slot.type || '', 
            isDouble: slot.isDouble || false, 
            status: slot.status || 'Booked',
            customDuration: slot.customDuration || undefined 
        });
    } else {
        // --- B. CREATING NEW SLOT ---
        
        // CHECK: Is this a "Grid Click" (has date) or "Add Button" (no date)?
        if (!slot.date) {
            // >>> FRESH START (Add Button) <<<
            // FIX: Set date and time to empty strings so user must select them
            setEditForm({
                date: '', 
                time: '',
                location: '', 
                type: preferredVehicle,
                studentId: '',
                isDouble: profile.defaultDoubleLesson ?? false,
                status: 'Booked',
                customDuration: undefined
            });
        } else {
            // >>> STICKY START (Grid Click) <<<
            setEditForm(prev => ({
                ...prev, 
                id: undefined,
                studentId: '',
                
                // Enforce clicked date/time
                date: slot.date,
                time: slot.time,
                
                // Keep sticky location/type if available
                location: '',
                type: preferredVehicle,
                
                isDouble: profile.defaultDoubleLesson ?? false,
                status: 'Booked',
                customDuration: undefined
            }));
        }
    }
  };
  
  // Logic checks
  const isBlockMode = editForm.status === 'Blocked';
  const isFormValid = isBlockMode ? (!!editForm.date && !!editForm.time && !!editForm.type) : (!!editForm.date && !!editForm.time && !!editForm.location && !!editForm.type); 
  const hasChanges = !editingSlot?.id ? true : ( editForm.date !== editingSlot.date || editForm.time !== editingSlot.time || (editForm.location || '') !== (editingSlot.location || '') || (editForm.studentId || '') !== (editingSlot.studentId || '') || (editForm.type || '') !== (editingSlot.type || '') || (editForm.status || 'Booked') !== (editingSlot.status || 'Booked') || (!!editForm.isDouble) !== (!!editingSlot.isDouble) || (editForm.customDuration || 0) !== (editingSlot.customDuration || 0));
  const isSlotModified = isFormValid && hasChanges;
  const isStudentModified = isEditingStudent ? JSON.stringify(studentForm) !== JSON.stringify(originalStudent) : (studentForm.name.trim() !== '' && studentForm.phone.trim() !== '');

  // --- ACTIONS ---
  
  const saveSlotEdit = async () => { 
    await saveLesson(
      editForm, 
      editingSlot, 
      (successMsg: string) => { 
        setEditingSlot(null); 
        setValidationMsg(''); 
        
        const preferredVehicle = (profile?.vehicleTypes && profile.vehicleTypes.length > 0) 
            ? profile.vehicleTypes[0] 
            : DEFAULT_VEHICLE_ID;

        // Reset form to defaults after save
        setEditForm({ date: '', time: '', location: '', type: preferredVehicle }); 
        showToast(successMsg, 'success'); 
      }, 
      (errorMsg: string) => showToast(errorMsg, 'error')
    ); 
  };
  
  const handleDeleteSlotClick = () => { 
    if (!editingSlot?.id) return; 
    setConfirmDialog({ 
      isOpen: true, 
      title: "Delete Lesson", 
      msg: "Are you sure? This action cannot be undone.", 
      action: async () => { 
        await deleteLesson(
          editingSlot.id, 
          () => { 
            setEditingSlot(null); 
            setValidationMsg(''); 
            setConfirmDialog(null); 
            showToast("Lesson deleted successfully", "success"); 
          }, 
          (msg: string) => showToast(msg, "error")
        ); 
      } 
    }); 
  };

  const handleSaveStudent = async () => {
     await saveStudent(studentForm, isEditingStudent, () => {
         setIsStudentModalOpen(false);
     });
  };

  const handleDeleteStudentClick = () => { 
    if (!studentForm.id) return; 
    setConfirmDialog({ 
      isOpen: true, 
      title: "Delete Student", 
      msg: `Warning: You are about to delete ${studentForm.name}. This will permanently remove their contact info, exam routes, and lesson history. Any remaining balance (${studentForm.balance} lessons) will be lost. This action cannot be undone.`, 
      action: async () => { 
          await deleteStudent(studentForm.id, () => {
             setIsStudentModalOpen(false);
             setConfirmDialog(null);
          });
      } 
    }); 
  };

  const handleUnlinkStudent = async (studentId: string) => {
    try {
        await updateDoc(doc(db, "students", studentId), {
            uid: null,
            inviteToken: null,
            claimedAt: null,
            inviteExpiresAt: null
        });
        showToast("Device unlinked. You can now send a new invite.", "success");
    } catch (e) {
        console.error(e);
        showToast("Failed to unlink.", "error");
    }
  };
  
  const saveProfile = async (profileOverride?: any) => { 
    if (!user) return; 
    setSaveProfileLoading(true); 
    try { 
      const dataToSave = { ...profile, ...(profileOverride || {}) }; 
      await setDoc(doc(db, "instructors", user.uid), dataToSave); 
      setProfile(dataToSave); 
      setOriginalProfile({ ...dataToSave }); 
      showToast("Profile updated"); 
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

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-midnight text-white font-sans relative pb-20">
      
      <ConfirmModal 
        isOpen={!!confirmDialog?.isOpen} title={confirmDialog?.title || ''} msg={confirmDialog?.msg || ''} isLoading={saveSlotLoading || saveStudentLoading} 
        onConfirm={async () => { if (confirmDialog?.action) await confirmDialog.action(); }} onCancel={() => setConfirmDialog(null)}
      />

      {/* HEADER */}
      <header className="bg-header border-b border-gray-800 sticky top-0 z-[60] shadow-sm w-full">
         <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            {/* Left: Current Tab Icon */}
            <div className="flex items-center gap-2 w-auto md:w-32 flex-shrink-0 justify-start">
                 <div className="bg-orange/10 p-2 rounded-lg border border-orange/20 flex-shrink-0 z-10 relative">
                    {activeTab === 'diary' && <Calendar className="text-orange" size={18} />}
                    {activeTab === 'students' && <Users className="text-orange" size={18} />}
                    {activeTab === 'payments' && <CreditCard className="text-orange" size={18} />}
                    {activeTab === 'settings' && <SettingsIcon className="text-orange" size={18} />}
                 </div>
                 <div className={`overflow-hidden transition-all duration-500 ease-in-out flex flex-col justify-center ${"max-w-0 opacity-0 md:max-w-[150px] md:opacity-100"}`}>
                    <span className="capitalize font-bold text-white truncate pl-1 whitespace-nowrap">{activeTab}</span>
                 </div>
            </div>

            {/* Middle: Tab Navigation */}
            <nav className="flex bg-midnight rounded-lg p-1 border border-gray-800 z-10 relative">
                {(['diary', 'students', 'payments'] as Tab[]).map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} className={`px-3 sm:px-6 py-1.5 rounded-md text-[11px] sm:text-sm font-bold capitalize transition-all ${activeTab === t ? 'bg-orange text-white shadow-sm' : 'text-textGrey hover:text-orange'}`}>{t}</button>
                ))}
            </nav>

            {/* Right: Actions */}
            <div className="flex items-center justify-end gap-1 sm:gap-2 w-auto md:w-32 flex-shrink-0 relative">
                <div className={`flex items-center gap-2 transition-all duration-500 ease-in-out ${"absolute opacity-0 scale-90 pointer-events-none md:static md:opacity-100 md:scale-100 md:pointer-events-auto"}`}>
                   <button onClick={() => setActiveTab('settings')} className={`p-1.5 sm:p-2 rounded-lg ${activeTab === 'settings' ? 'text-orange bg-orange/10' : 'text-textGrey hover-bg-theme'}`}><SettingsIcon size={18} /></button>
                   <button onClick={toggleTheme} className="p-1.5 sm:p-2 hover-bg-theme rounded-lg text-textGrey">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
                   <button onClick={() => signOut(auth)} className="p-1.5 sm:p-2 hover-bg-theme rounded-lg text-textGrey"><LogOut size={18} /></button>
                </div>
                
                {/* Mobile Menu Toggle */}
                <div className={`transition-all duration-500 ease-in-out ${"md:absolute md:opacity-0 md:scale-90 md:pointer-events-none opacity-100 scale-100"}`}>
                   <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 hover-bg-theme rounded-lg text-textGrey transition-colors">{isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}</button>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMobileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsMobileMenuOpen(false)} />
                    <div className="absolute top-14 right-0 w-48 bg-slate border border-gray-800 rounded-xl shadow-2xl p-2 flex flex-col gap-1 z-50 md:hidden animate-in zoom-in-95 duration-200 origin-top-right">
                       <button onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === 'settings' ? 'text-orange bg-orange/10' : 'text-textGrey hover-bg-theme'}`}><SettingsIcon size={16} /> <span>Settings</span></button>
                       <button onClick={() => { toggleTheme(); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-bold text-textGrey hover-bg-theme transition-colors">{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span></button>
                       <div className="h-[1px] bg-gray-800/50 my-1 mx-2" />
                       <button onClick={() => signOut(auth)} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-bold text-statusRed hover:bg-statusRed/10 transition-colors"><LogOut size={16} /> <span>Log Out</span></button>
                    </div>
                  </>
                )}
            </div>
         </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        {activeTab === 'diary' && (
            <div className="animate-in fade-in zoom-in-[0.99] duration-300">
                <DiaryView 
                  slots={processedSlots} 
                  setEditingSlot={handleSetEditingSlot} 
                  lessonDuration={Number(profile?.lessonDuration) || 45} 
                />
            </div>
        )}
        {activeTab === 'students' && (
            <div className="animate-in fade-in zoom-in-[0.99] duration-300">
                <StudentsView 
                    students={students} 
                    updateBalance={updateBalance} 
                    onSendInvite={sendInvite} 
                    openStudentModal={(stu: any) => { 
                        const preferredVehicle = (profile?.vehicleTypes && profile.vehicleTypes.length > 0) 
                            ? profile.vehicleTypes[0] 
                            : DEFAULT_VEHICLE_ID;

                        setStudentForm(stu || { 
                            id: '', 
                            name: '', 
                            phone: '', 
                            vehicle: preferredVehicle, 
                            examRoute: 'Not Assigned', 
                            balance: 10 
                        }); 
                        setOriginalStudent(stu || null); 
                        setIsEditingStudent(!!stu); 
                        setIsStudentModalOpen(true); 
                    }} 
                />
            </div>
        )}
        {activeTab === 'payments' && (
            <div className="animate-in fade-in zoom-in-[0.99] duration-300">
                <PaymentsView studentCount={students.length} />
            </div>
        )}
        {activeTab === 'settings' && (
            <div className="animate-in fade-in zoom-in-[0.99] duration-300">
                <SettingsView profile={profile} setProfile={setProfile} onSave={saveProfile} isLoading={saveProfileLoading} />
            </div>
        )}
      </main>

      {/* MODALS */}
      {/* UPDATED: Passing defaultDoubleLesson prop */}
      <EditLessonModal 
        editingSlot={editingSlot} editForm={editForm} setEditForm={setEditForm} setEditingSlot={handleSetEditingSlot} 
        validationMsg={validationMsg} setValidationMsg={setValidationMsg} saveSlotLoading={saveSlotLoading} 
        isSlotModified={isSlotModified} onSave={saveSlotEdit} onDelete={handleDeleteSlotClick} 
        lessonDuration={Number(profile?.lessonDuration) || 45} 
        defaultDoubleLesson={!!profile?.defaultDoubleLesson} 
        students={students} 
        vehicleTypes={profile?.vehicleTypes && profile.vehicleTypes.length > 0 ? profile.vehicleTypes : []} 
      />
      
      <StudentFormModal 
        isOpen={isStudentModalOpen} setIsOpen={setIsStudentModalOpen} isEditing={isEditingStudent} 
        studentForm={studentForm} setStudentForm={setStudentForm} studentError={studentError} 
        saveStudentLoading={saveStudentLoading} 
        isStudentModified={isStudentModified} 
        onSave={handleSaveStudent} 
        onDelete={handleDeleteStudentClick} 
        onSendInvite={sendInvite}
        onCancelInvite={cancelInvite} 
        onUnlink={handleUnlinkStudent} 
        students={students}
        showToast={showToast}
        teacherVehicles={profile?.vehicleTypes || []}
      />
    </div>
  );
}