import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
// --- ADDED: addDoc for creating notifications ---
import { collection, query, where, onSnapshot, doc, runTransaction, addDoc } from 'firebase/firestore'; 

export function useStudentData() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Data State
  const [userProfile, setUserProfile] = useState<any>(null); 
  const [profiles, setProfiles] = useState<any[]>([]); 
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [instructors, setInstructors] = useState<Record<string, any>>({}); 
  const [lessons, setLessons] = useState<any[]>([]); 

  // 1. Initial Load
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const unsubUser = onSnapshot(doc(db, "users", uid), (snap) => {
        if (snap.exists()) setUserProfile(snap.data());
    });

    const q = query(collection(db, "students"), where("uid", "==", uid));
    const unsubStudents = onSnapshot(q, (snapshot) => {
      const loadedProfiles = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setProfiles(loadedProfiles);
      setLoading(false);
    });

    return () => { unsubUser(); unsubStudents(); };
  }, []);

  // [Derived State] Active Profile
  const activeProfile = useMemo(() => {
      if (profiles.length === 0) return null;
      if (activeProfileId) {
          return profiles.find(p => p.id === activeProfileId) || profiles[0];
      }
      return profiles[0];
  }, [profiles, activeProfileId]);

  const setActiveProfile = (profile: any) => {
      if (profile?.id) setActiveProfileId(profile.id);
  };

  // 2. Fetch Instructors
  useEffect(() => {
    if (profiles.length === 0) return;
    const teacherIds = [...new Set(profiles.map(p => p.teacherId))].filter(Boolean);
    const unsubs = teacherIds.map(id => 
      onSnapshot(doc(db, "instructors", id), (snap) => {
        if (snap.exists()) {
          setInstructors(prev => ({ ...prev, [id]: { id: snap.id, ...snap.data() } }));
        }
      })
    );
    return () => unsubs.forEach(fn => fn());
  }, [profiles]);

  // 3. Fetch Lessons
  useEffect(() => {
    if (!activeProfile) {
        setLessons([]);
        return;
    }
    const q = query(collection(db, "slots"), where("studentId", "==", activeProfile.id));
    const unsub = onSnapshot(q, (snap) => {
        const loadedLessons = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort ALL lessons chronologically
        loadedLessons.sort((a: any, b: any) => (a.date + a.time).localeCompare(b.date + b.time));
        setLessons(loadedLessons);
    });
    return () => unsub();
  }, [activeProfile?.id]); 

  // 4. Smart Filtering
  const upcomingLessons = useMemo(() => {
    return lessons.filter(l => {
        if (!l.date || !l.time) return false;
        
        const now = new Date();
        const endTimeStr = l.endTime || new Date(new Date(`${l.date}T${l.time}`).getTime() + 60*60000).toTimeString().slice(0, 5);
        const lessonEnd = new Date(`${l.date}T${endTimeStr}`);

        return now < lessonEnd && l.status === 'Booked';
    });
  }, [lessons]);

  const nextLesson = upcomingLessons.length > 0 ? upcomingLessons[0] : null;

  // 5. Actions
  const cancelLesson = async (
    lessonId: string, 
    onSuccess?: () => void, 
    onError?: (msg: string) => void 
  ) => {
    if (!activeProfile || !lessonId || typeof lessonId !== 'string') {
        if (onError) onError("Invalid lesson reference.");
        return;
    }
    
    setActionLoading(true);

    try {
      // Variables to store details during the transaction
      let teacherIdToNotify = '';
      let cancelledDate = '';
      let cancelledTime = '';

      await runTransaction(db, async (transaction) => {
        const slotRef = doc(db, "slots", lessonId);
        const studentRef = doc(db, "students", activeProfile.id);
        
        const slotDoc = await transaction.get(slotRef);
        const studentDoc = await transaction.get(studentRef);

        if (!slotDoc.exists() || !studentDoc.exists()) throw new Error("Record not found.");

        const slotData = slotDoc.data();
        const studentData = studentDoc.data();

        if (slotData.studentId !== activeProfile.id) {
            throw new Error("Unauthorized cancellation.");
        }

        // Capture data for the notification payload
        teacherIdToNotify = slotData.teacherId;
        cancelledDate = slotData.date;
        cancelledTime = slotData.time;

        // Clean Reset
        transaction.update(slotRef, {
            status: 'Open',
            studentId: null,
            bookedBy: null
        });
        
        transaction.update(studentRef, {
            balance: (studentData.balance || 0) + 1
        });
      });

      // --- NEW: THE NOTIFICATION TRIGGER ---
      // If the transaction succeeded, immediately send the notification to the teacher!
      if (teacherIdToNotify) {
        await addDoc(collection(db, 'notifications'), {
            userId: teacherIdToNotify,      
            type: 'cancellation',
            
            // 1. The Title (Fallback + i18n Key)
            title: 'Lesson Cancelled',
            titleKey: 'notifications.cancelTitle', 
            
            // 2. The Message (Fallback + i18n Key + Params)
            message: `${activeProfile?.name || 'A student'} cancelled their lesson on ${cancelledDate} at ${cancelledTime}.`,
            messageKey: 'notifications.cancelMessage', 
            messageParams: { 
                name: activeProfile?.name || 'A student', 
                date: cancelledDate,
                time: cancelledTime
            },
            
            // 3. System Data
            isRead: false,
            createdAt: Date.now(),
            relatedLessonId: lessonId,
            relatedStudentId: activeProfile.id
        });
      }

      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Cancel Error:", error);
      if (onError) onError(error.message || "Failed to cancel lesson.");
    } finally {
      setActionLoading(false);
    }
  };

  return {
    loading,
    actionLoading,
    userProfile,
    profiles,
    activeProfile,
    setActiveProfile,
    instructors,
    lessons,         
    upcomingLessons, 
    nextLesson,
    cancelLesson
  };
}