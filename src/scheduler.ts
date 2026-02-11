import { parse, isSaturday, isSunday } from 'date-fns';

// 1. CONFIGURATION
const RESTRICTED_ZONES = {
  MORNING: { start: 450, end: 570 },  // 07:30 - 09:30
  EVENING: { start: 990, end: 1170 }, // 16:30 - 19:30
};

// --- HELPERS ---
export const toMins = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const fromMins = (totalMinutes: number) => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// --- SMART START TIME LOGIC ---
export const getSmartStartTime = (clickedHour: number, daySlots: any[], lessonDuration: number) => {
  const clickedStartMins = clickedHour * 60;     
  const clickedEndMins = (clickedHour + 1) * 60; 

  let maxEndTime = clickedStartMins;

  daySlots.forEach(slot => {
      const startMins = toMins(slot.time);
      
      let duration = slot.duration; 
      if (!duration) {
           if (slot.customDuration) duration = slot.customDuration;
           else duration = slot.isDouble ? lessonDuration * 2 : lessonDuration;
      }

      const endMins = startMins + duration;

      if (endMins > clickedStartMins && startMins < clickedEndMins) {
          if (endMins > maxEndTime) {
              maxEndTime = endMins;
          }
      }
  });

  return fromMins(maxEndTime);
};

// --- EXISTING VALIDATOR ---
export const checkSlotValidity = (
  dateStr: string,
  timeStr: string,
  duration: number,
  existingSlots: any[],
  currentSlotId?: string
): { valid: boolean; error?: string } => {
  if (!dateStr || !timeStr) return { valid: false, error: "Invalid Date/Time" };

  const date = parse(dateStr, 'yyyy-MM-dd', new Date());
  const startMins = toMins(timeStr);
  const endMins = startMins + duration;

  if (startMins < 360) return { valid: false, error: "Too Early (Before 06:00)" };
  if (endMins > 1410) return { valid: false, error: "Too Late (After 23:30)" };

  const isRestrictedDay = !isSunday(date);
  const isSat = isSaturday(date);

  if (isRestrictedDay) {
    const hitsMorning = startMins < RESTRICTED_ZONES.MORNING.end && endMins > RESTRICTED_ZONES.MORNING.start;
    const hitsEvening = !isSat && (startMins < RESTRICTED_ZONES.EVENING.end && endMins > RESTRICTED_ZONES.EVENING.start);

    if (hitsMorning) return { valid: false, error: "⚠️ Restricted: Morning Zone (07:30-09:30)" };
    if (hitsEvening) return { valid: false, error: "⚠️ Restricted: Evening Zone (16:30-19:30)" };
  }

  const daySlots = existingSlots.filter(s => s.date === dateStr && s.id !== currentSlotId);
  const hasCollision = daySlots.some(s => {
    const sStart = toMins(s.time);
    const sEnd = toMins(s.endTime);
    return startMins < sEnd && endMins > sStart;
  });

  if (hasCollision) return { valid: false, error: "Time Collision detected" };
  return { valid: true };
};