import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, runTransaction } from 'firebase/firestore'; 

export function useStudentData() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false); // [NEW] Track transaction status
  
  // Data State
  const [userProfile, setUserProfile] = useState<any>(null); 
  const [profiles, setProfiles] = useState<any[]>([]); 
  const [activeProfile, setActiveProfile] = useState<any>(null); 
  const [instructors, setInstructors] = useState<Record<string, any>>({}); 
  const [lessons, setLessons] = useState<any[]>([]); 

  // 1. Initial Load (User & Profiles)
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
      if (loadedProfiles.length > 0) {
        setActiveProfile((prev: any) => prev || loadedProfiles[0]);
      }
      setLoading(false);
    });

    return () => { unsubUser(); unsubStudents(); };
  }, []);

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
        loadedLessons.sort((a: any, b: any) => (a.date + a.time).localeCompare(b.date + b.time));
        setLessons(loadedLessons);
    });
    return () => unsub();
  }, [activeProfile]);

  // 4. Derived State
  const upcomingLessons = useMemo(() => {
    return lessons.filter(l => {
        const lessonDate = new Date(l.date + 'T' + l.time);
        return lessonDate >= new Date() || l.status === 'Booked';
    });
  }, [lessons]);

  const nextLesson = upcomingLessons.length > 0 ? upcomingLessons[0] : null;

  // 5. Actions
  const cancelLesson = async (lessonId: string, onSuccess?: () => void) => {
    if (!activeProfile) return;
    
    // [REMOVED] window.confirm logic is now handled by the UI component
    setActionLoading(true);

    try {
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

        transaction.update(slotRef, {
            status: 'Open',
            studentId: null
        });
        
        transaction.update(studentRef, {
            balance: (studentData.balance || 0) + 1
        });
      });
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error(error);
      alert("Failed to cancel: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  return {
    loading,
    actionLoading, // [NEW] Exported for modal spinner
    userProfile,
    profiles,
    activeProfile,
    setActiveProfile,
    instructors,
    lessons,
    nextLesson,
    cancelLesson
  };
}