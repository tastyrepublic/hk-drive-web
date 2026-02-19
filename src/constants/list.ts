// src/constants/list.ts

// --- HELPER: Get Label Key by ID ---
const getLabelKey = (list: { id: string, label: string }[], value: string) => {
  if (!value) return '';
  const item = list.find(i => i.id === value);
  return item ? item.label : value; 
};

// =========================================
// 1. VEHICLE TYPES
// =========================================
export const VEHICLE_TYPES = [
  { id: '1a', label: 'vehicle.private_auto' },
  { id: '1',  label: 'vehicle.private_manual' },
  { id: '2a', label: 'vehicle.van_auto' },
  { id: '2',  label: 'vehicle.van_manual' },
  { id: '3a', label: 'vehicle.motorcycle_auto' },
  { id: '3',  label: 'vehicle.motorcycle_manual' },
  { id: '6',  label: 'vehicle.taxi' },
];

export const DEFAULT_VEHICLE_ID = '1a';
export const getVehicleLabel = (id: string) => getLabelKey(VEHICLE_TYPES, id);

// =========================================
// 2. EXAM CENTERS
// =========================================
export const EXAM_CENTERS = [
  { id: 'tin_kwong',    label: 'exam_center.tin_kwong',    region: 'Kowloon' },
  { id: 'pui_ching',    label: 'exam_center.pui_ching',    region: 'Kowloon' },
  { id: 'chung_yee',    label: 'exam_center.chung_yee',    region: 'Kowloon' },
  { id: 'yau_tong',     label: 'exam_center.yau_tong',     region: 'Kowloon' },
  { id: 'chak_on',      label: 'exam_center.chak_on',      region: 'Kowloon' },
  { id: 'pak_tin',      label: 'exam_center.pak_tin',      region: 'Kowloon' },
  { id: 'happy_valley', label: 'exam_center.happy_valley', region: 'HK Island' },
  { id: 'so_kon_po',    label: 'exam_center.so_kon_po',    region: 'HK Island' },
  { id: 'ap_lei_chau',  label: 'exam_center.ap_lei_chau',  region: 'HK Island' },
  { id: 'wing_hau',     label: 'exam_center.wing_hau',     region: 'New Territories' },
  { id: 'shek_yam',     label: 'exam_center.shek_yam',     region: 'New Territories' },
  { id: 'shatin_safe',  label: 'exam_center.shatin_safe',  region: 'New Territories' },
  { id: 'yuen_long',    label: 'exam_center.yuen_long',    region: 'New Territories' },
  { id: 'tsuen_wan',    label: 'exam_center.tsuen_wan',    region: 'New Territories' },
  { id: 'duckling_hill',label: 'exam_center.duckling_hill', region: 'New Territories' },
];

export const getExamCenterLabel = (id: string) => getLabelKey(EXAM_CENTERS, id);

// =========================================
// 3. EXAM ROUTES
// =========================================
export const EXAM_ROUTES = [
  { id: 'tk_1', centerId: 'tin_kwong', label: 'exam_route.tin_kwong' },
  { id: 'tk_2', centerId: 'tin_kwong', label: 'exam_route.ma_tau_wai' },
  { id: 'tk_3', centerId: 'tin_kwong', label: 'exam_route.to_kwa_wan' },
  { id: 'pc_1', centerId: 'pui_ching', label: 'exam_route.pui_ching' },
  { id: 'pc_2', centerId: 'pui_ching', label: 'exam_route.princess_margaret' },
  { id: 'hv_1', centerId: 'happy_valley', label: 'exam_route.happy_valley' },
  { id: 'hv_2', centerId: 'happy_valley', label: 'exam_route.ventris' },
  { id: 'ls_1', centerId: 'loyal_st',   label: 'exam_route.loyal_st' }, 
  { id: 'wh_1', centerId: 'wing_hau',   label: 'exam_route.wing_hau' },
  { id: 'wh_2', centerId: 'wing_hau',   label: 'exam_route.kwai_shing' },
  { id: 'cy_1', centerId: 'chung_yee',  label: 'exam_route.chung_yee' },
  { id: 'cy_2', centerId: 'chung_yee',  label: 'exam_route.carmel_village' },
  { id: 'sy_1', centerId: 'shek_yam',   label: 'exam_route.shek_yam' },
  { id: 'st_1', centerId: 'shatin_safe', label: 'exam_route.shatin_1' },
  { id: 'st_2', centerId: 'shatin_safe', label: 'exam_route.shatin_2' },
  { id: 'yl_1', centerId: 'yuen_long',  label: 'exam_route.yuen_long_1' },
  { id: 'yl_2', centerId: 'yuen_long',  label: 'exam_route.yuen_long_2' },
  { id: 'skp_1', centerId: 'so_kon_po',  label: 'exam_route.so_kon_po' },
  { id: 'skp_2', centerId: 'so_kon_po',  label: 'exam_route.caroline_hill' },
  { id: 'yt_1', centerId: 'yau_tong',   label: 'exam_route.yau_tong' },
  { id: 'yt_2', centerId: 'yau_tong',   label: 'exam_route.ko_chiu' },
  { id: 'co_1', centerId: 'chak_on',    label: 'exam_route.chak_on' },
  { id: 'pt_1', centerId: 'pak_tin',    label: 'exam_route.pak_tin' },
  { id: 'dh_1', centerId: 'duckling_hill', label: 'exam_route.duckling_hill' },
  { id: 'alc_1', centerId: 'ap_lei_chau', label: 'exam_route.ap_lei_chau' },
  { id: 'tw_1', centerId: 'tsuen_wan', label: 'exam_route.tsuen_wan' },
];

export const getExamRouteLabel = (id: string) => getLabelKey(EXAM_ROUTES, id);

// =========================================
// 4. LESSON LOCATIONS (Pickups)
// =========================================
export const LESSON_LOCATIONS = [
  { id: 'kowloon_tong', label: 'location.kowloon_tong' },
  { id: 'sham_shui_po', label: 'location.sham_shui_po' },
  { id: 'nam_cheong',   label: 'location.nam_cheong' },
  { id: 'pui_ching',    label: 'location.pui_ching' },
  { id: 'happy_valley', label: 'location.happy_valley' },
  { id: 'tin_kwong',    label: 'location.tin_kwong' },
  { id: 'yau_tong',     label: 'location.yau_tong' },
  { id: 'shatin',       label: 'location.shatin' },
  { id: 'yuen_long',    label: 'location.yuen_long' },
  { id: 'tsuen_wan',    label: 'location.tsuen_wan' },
];
export const getLessonLocationLabel = (id: string) => getLabelKey(LESSON_LOCATIONS, id);

// =========================================
// 5. BLOCK REASONS
// =========================================
export const BLOCK_REASONS = [
  { id: 'lunch',       label: 'block_reason.lunch' },
  { id: 'personal',    label: 'block_reason.personal' },
  { id: 'maintenance', label: 'block_reason.maintenance' },
  { id: 'holiday',     label: 'block_reason.holiday' },
  { id: 'diu',         label: 'block_reason.diu' },
];
export const getBlockReasonLabel = (id: string) => getLabelKey(BLOCK_REASONS, id);

// =========================================
// 6. DURATIONS
// =========================================
export const LESSON_DURATIONS = [40, 45, 60];

// =========================================
// 7. NEW: PORTAL UI KEYS (For BalanceCard & NextLessonCard)
// =========================================
export const PORTAL_UI = {
  // Balance Card
  TOP_UP: 'balance.top_up', // e.g., "Top Up"
  TOP_UP_DESC: 'balance.top_up_desc', // e.g., "Buy more lessons / Request from teacher"
  PROGRESS_TITLE: 'balance.progress_title', // e.g., "Learning Progress"
  
  // Next Lesson Card
  BOOK_LESSON: 'common.book_lesson', // e.g., "Book a Lesson"
  NO_LESSONS: 'next_lesson.no_lessons',
};

// =========================================
// 8. EXAM CENTER -> PICKUP MAPPING
// =========================================
export const EXAM_CENTER_PICKUPS: Record<string, string[]> = {
  'tin_kwong':   ['kowloon_tong', 'tin_kwong'],
  'pui_ching':   ['kowloon_tong', 'pui_ching'],
  'chung_yee':   ['kowloon_tong', 'pui_ching'],
  'yau_tong':    ['yau_tong', 'kowloon_tong'],
  'chak_on':     ['sham_shui_po', 'nam_cheong'],
  'pak_tin':     ['sham_shui_po', 'kowloon_tong'],
  'happy_valley': ['happy_valley'],
  'so_kon_po':    ['happy_valley'],
  'ap_lei_chau':  ['happy_valley'], 
  'wing_hau':    ['nam_cheong', 'sham_shui_po'],
  'shek_yam':    ['nam_cheong'],
  'shatin_safe': ['shatin'],
  'yuen_long':   ['yuen_long'],
  'tsuen_wan':   ['tsuen_wan'],
  'duckling_hill': ['yau_tong', 'kowloon_tong'],
};

export const EXAM_REGIONS = ['All', 'Kowloon', 'HK Island', 'New Territories'];

export const RESTRICTED_HOURS = [
  { days: [1, 2, 3, 4, 5], start: '07:30', end: '09:30', label: 'common.restricted' },
  { days: [1, 2, 3, 4, 5], start: '16:30', end: '19:30', label: 'common.restricted' },
  { days: [6], start: '07:30', end: '09:30', label: 'common.restricted' },
];