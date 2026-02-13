import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, runTransaction, doc } from 'firebase/firestore';
import { Calendar, Clock, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getExamCenterLabel } from '../../constants/list';

interface Props {
  instructorName: string;
  studentProfile: any; 
  isDark: boolean;
}

export function ScheduleView({ instructorName, studentProfile, isDark }: Props) {
  const [loading, setLoading] = useState(true);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [bookingId, setBookingId] = useState<string | null>(null);
  
  // --- FETCH OPEN SLOTS ---
  useEffect(() => {
    if (!studentProfile?.teacherId) return;

    const q = query(
        collection(db, "slots"), 
        where("teacherId", "==", studentProfile.teacherId),
        where("status", "==", "Open")
    );

    const unsub = onSnapshot(q, (snapshot) => {
        const slots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const myExamRoute = studentProfile.examRoute;
        
        const relevantSlots = slots.filter((slot: any) => {
            if (!myExamRoute || myExamRoute === 'Not Assigned') return false;
            return slot.examCenter === myExamRoute;
        });

        relevantSlots.sort((a: any, b: any) => (a.date + a.time).localeCompare(b.date + b.time));
        
        setAvailableSlots(relevantSlots);
        setLoading(false);
    });

    return () => unsub();
  }, [studentProfile]);

  // --- BOOKING LOGIC ---
  const handleBook = async (slot: any) => {
      if (bookingId) return; 
      
      const confirmMsg = `Confirm booking for ${slot.date} at ${slot.time}?\n1 Credit will be deducted.`;
      if (!window.confirm(confirmMsg)) return;

      setBookingId(slot.id);

      try {
          await runTransaction(db, async (transaction) => {
              const slotRef = doc(db, "slots", slot.id);
              const studentRef = doc(db, "students", studentProfile.id);

              const slotDoc = await transaction.get(slotRef);
              const studentDoc = await transaction.get(studentRef);

              if (!slotDoc.exists() || !studentDoc.exists()) throw new Error("Document does not exist!");

              const freshSlot = slotDoc.data();
              const freshStudent = studentDoc.data();

              if (freshSlot.status !== 'Open') {
                  throw new Error("Sorry, this slot was just taken!");
              }
              
              if (freshStudent.balance < 1) {
                  throw new Error("Insufficient balance! Please purchase a package.");
              }

              // [UPDATED] Set bookedBy to 'student'
              transaction.update(slotRef, {
                  status: 'Booked',
                  studentId: studentProfile.id,
                  bookedBy: 'student' 
              });

              transaction.update(studentRef, {
                  balance: freshStudent.balance - 1
              });
          });

          alert("Booking Successful!");
      } catch (e: any) {
          console.error("Booking failed: ", e);
          alert(e.message || "Booking failed. Please try again.");
      } finally {
          setBookingId(null);
      }
  };

  const groupedSlots = useMemo(() => {
      const groups: Record<string, any[]> = {};
      availableSlots.forEach(slot => {
          if (!groups[slot.date]) groups[slot.date] = [];
          groups[slot.date].push(slot);
      });
      return groups;
  }, [availableSlots]);

  const bgClass = isDark ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

  if (!studentProfile?.examRoute || studentProfile.examRoute === 'Not Assigned') {
      return (
        <div className={`p-8 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center text-center gap-3 ${isDark ? 'border-gray-800 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
            <AlertCircle size={48} className="text-orange opacity-50" />
            <div>
                <h3 className="font-bold text-lg">No Exam Route Assigned</h3>
                <p className={`text-sm ${textMuted} mt-1 max-w-xs mx-auto`}>
                    Please contact {instructorName} to assign your exam route before you can book lessons.
                </p>
            </div>
        </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold flex items-center gap-2">
            Available Slots
            <span className="text-[10px] bg-orange/20 text-orange px-2 py-0.5 rounded-full uppercase tracking-wider font-black">
                {getExamCenterLabel(studentProfile.examRoute)}
            </span>
        </h2>
        <p className={`text-xs ${textMuted}`}>Book lessons with {instructorName}</p>
      </div>

      {loading ? (
          <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-orange" size={32} />
          </div>
      ) : availableSlots.length === 0 ? (
        <div className={`p-10 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center text-center gap-4 ${isDark ? 'border-gray-800 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
            <Calendar size={48} className="opacity-20" />
            <div>
                <p className="font-bold text-lg">No slots available</p>
                <p className={`text-xs ${textMuted} mt-1`}>
                    There are currently no open slots for <span className="text-orange">{getExamCenterLabel(studentProfile.examRoute)}</span>.
                    <br/>Check back later or contact your instructor.
                </p>
            </div>
        </div>
      ) : (
        <div className="space-y-6">
            {Object.keys(groupedSlots).sort().map(date => {
                const slots = groupedSlots[date];
                const dateObj = parseISO(date);
                
                return (
                    <div key={date} className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className={`h-[1px] flex-1 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`} />
                            <div className={`text-xs font-bold uppercase tracking-wider ${textMuted}`}>
                                {format(dateObj, 'EEEE, MMM d')}
                            </div>
                            <div className={`h-[1px] flex-1 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`} />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {slots.map(slot => (
                                <div 
                                    key={slot.id}
                                    className={`p-4 rounded-xl border flex flex-col gap-3 transition-all ${bgClass} hover:border-orange/50 hover:shadow-lg group relative overflow-hidden`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-orange font-black text-lg">
                                            <Clock size={16} />
                                            {slot.time}
                                        </div>
                                        <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-800 text-gray-400`}>
                                            {slot.duration || 45}m
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-1.5 text-xs opacity-70">
                                        <MapPin size={14} className="shrink-0 mt-0.5" />
                                        <span className="line-clamp-2">{slot.location || 'No Location'}</span>
                                    </div>

                                    <button 
                                        onClick={() => handleBook(slot)}
                                        disabled={!!bookingId}
                                        className="mt-1 w-full py-2 bg-white/5 hover:bg-orange text-orange hover:text-white border border-orange/30 hover:border-orange rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {bookingId === slot.id ? (
                                            <Loader2 className="animate-spin" size={14} />
                                        ) : (
                                            <>Book Now</>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
      )}
    </div>
  );
}