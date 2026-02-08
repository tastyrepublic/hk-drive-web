import { useState } from 'react';
import { db } from '../firebase';
import { 
  collection, doc, addDoc, updateDoc, deleteDoc, Timestamp 
} from 'firebase/firestore';

export function useStudentManager(
  user: any, 
  students: any[], 
  showToast: (msg: string, type?: 'success' | 'error') => void
) {
  const [loading, setLoading] = useState(false);

  // 1. SAVE (Add or Update)
  const saveStudent = async (
    studentForm: any, 
    isEditing: boolean, 
    onSuccess: () => void
  ) => {
    if (!user || !studentForm.name.trim()) return;

    // Duplicate Check (Only runs for new students)
    if (!isEditing) {
        const cleanPhone = studentForm.phone.replace(/\s/g, '');
        if (students.some((s: any) => s.phone.replace(/\s/g, '') === cleanPhone)) {
            showToast("Student with this phone already exists", "error");
            return; 
        }
    }

    setLoading(true);
    try {
      const linkedUid = (studentForm as any).linkedUid;
      
      if (isEditing && studentForm.id) {
        await updateDoc(doc(db, "students", studentForm.id), {
          name: studentForm.name,
          phone: studentForm.phone,
          vehicle: studentForm.vehicle,
          examRoute: studentForm.examRoute,
          ...(linkedUid ? { uid: linkedUid, claimedAt: new Date().toISOString() } : {})
        });
        showToast("Student updated");
      } else {
        await addDoc(collection(db, "students"), {
          name: studentForm.name,
          phone: studentForm.phone,
          vehicle: studentForm.vehicle,
          examRoute: studentForm.examRoute,
          balance: 10,
          teacherId: user.uid,
          createdAt: new Date().toISOString(),
          uid: linkedUid || null,
          claimedAt: linkedUid ? new Date().toISOString() : null
        });
        showToast("Student added");
      }
      onSuccess();
    } catch (e) {
      console.error(e);
      showToast("Error saving student", "error");
    } finally {
      setLoading(false);
    }
  };

  // 2. DELETE
  const deleteStudent = async (id: string, onSuccess: () => void) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, "students", id));
      showToast("Student deleted");
      onSuccess();
    } catch (e) {
      showToast("Error deleting student", "error");
    } finally {
      setLoading(false);
    }
  };

  // 3. UPDATE BALANCE
  const updateBalance = async (id: string, newBal: number) => {
    try {
        await updateDoc(doc(db, "students", id), { balance: newBal });
    } catch (e) {
        showToast("Error updating balance", "error");
    }
  };

  // 4. INVITE (Secure Logic)
  const sendInvite = async (student: any) => {
    if (!student || !student.id) return;

    let token = student.inviteToken;
    let expiresAt = student.inviteExpiresAt ? student.inviteExpiresAt.toMillis() : 0;
    const now = Date.now();

    // Generate new token if missing or expired
    if (!token || now > expiresAt) {
        showToast("Generating secure link...", "success");
        token = crypto.randomUUID().slice(0, 8);
        
        const newExpiryDate = new Date();
        newExpiryDate.setHours(newExpiryDate.getHours() + 2); // 48 Hours

        try {
            await updateDoc(doc(db, "students", student.id), {
                inviteToken: token,
                inviteExpiresAt: Timestamp.fromDate(newExpiryDate)
            });
        } catch (error) {
            showToast("Error generating link", "error");
            return;
        }
    }

    const domain = window.location.origin;
    const inviteUrl = `${domain}?invite=${student.id}&token=${token}`;
    const message = `Hi ${student.name}, please create your student account here (valid for 48 hours): ${inviteUrl}`;
    
    window.open(`https://wa.me/${student.phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // 5. NEW: CANCEL INVITE (Revokes the link)
  const cancelInvite = async (studentId: string) => {
    try {
        await updateDoc(doc(db, "students", studentId), {
            inviteToken: null,
            inviteExpiresAt: null
        });
        showToast("Invite link revoked", "success");
    } catch (e) {
        console.error(e);
        showToast("Error cancelling invite", "error");
    }
  };

  return { saveStudent, deleteStudent, updateBalance, sendInvite, cancelInvite, loading };
}