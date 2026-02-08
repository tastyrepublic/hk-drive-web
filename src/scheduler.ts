import { parse, isSaturday, isSunday } from 'date-fns';

// 1. CONFIGURATION (Minutes from midnight)
const RESTRICTED_ZONES = {
  MORNING: { start: 450, end: 570 },  // 07:30 - 09:30
  EVENING: { start: 990, end: 1170 }, // 16:30 - 19:30
};

// Helper: "09:30" -> 570 minutes
const toMins = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// 2. THE VALIDATOR FUNCTION
export const checkSlotValidity = (
  dateStr: string,       // "2024-02-01"
  timeStr: string,       // "16:00"
  duration: number,      // Duration in minutes (e.g. 45)
  existingSlots: any[],  // All loaded slots from DB
  currentSlotId?: string // ID of slot being edited (so it doesn't collide with itself)
): { valid: boolean; error?: string } => {

  if (!dateStr || !timeStr) return { valid: false, error: "Invalid Date/Time" };

  const date = parse(dateStr, 'yyyy-MM-dd', new Date());
  const startMins = toMins(timeStr);
  const endMins = startMins + duration;

  // --- RULE A: OPERATING HOURS (06:00 - 23:30) ---
  if (startMins < 360) return { valid: false, error: "Too Early (Before 06:00)" };
  if (endMins > 1410) return { valid: false, error: "Too Late (After 23:30)" };

  // --- RULE B: RESTRICTED ZONES ---
  const isRestrictedDay = !isSunday(date); // Mon-Sat are restricted
  const isSat = isSaturday(date);

  if (isRestrictedDay) {
    // Check overlap: (Start < ZoneEnd) AND (End > ZoneStart)
    const hitsMorning = startMins < RESTRICTED_ZONES.MORNING.end && endMins > RESTRICTED_ZONES.MORNING.start;
    // Saturday ONLY has morning restriction. Weekdays have both.
    const hitsEvening = !isSat && (startMins < RESTRICTED_ZONES.EVENING.end && endMins > RESTRICTED_ZONES.EVENING.start);

    if (hitsMorning) return { valid: false, error: "⚠️ Restricted: Morning Zone (07:30-09:30)" };
    if (hitsEvening) return { valid: false, error: "⚠️ Restricted: Evening Zone (16:30-19:30)" };
  }

  // --- RULE C: COLLISION DETECTION ---
  // Filter slots for the SAME DAY, excluding the one we are editing
  const daySlots = existingSlots.filter(s => 
    s.date === dateStr && s.id !== currentSlotId
  );

  const hasCollision = daySlots.some(s => {
    const sStart = toMins(s.time);
    const sEnd = toMins(s.endTime);
    // Overlap Formula
    return startMins < sEnd && endMins > sStart;
  });

  if (hasCollision) return { valid: false, error: "⛔ Time Collision detected" };

  return { valid: true };
};