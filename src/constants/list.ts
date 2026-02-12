// src/constants/list.ts

// --- HELPER: Get Label by ID (Safe for Legacy Data) ---
const getLabel = (list: { id: string, label: string }[], value: string) => {
  if (!value) return '';
  const item = list.find(i => i.id === value);
  return item ? item.label : value;
};

// =========================================
// 1. VEHICLE TYPES
// =========================================
export const VEHICLE_TYPES = [
  { id: '1a', label: 'Private Car (Auto) 1A' },
  { id: '1',  label: 'Private Car (Manual) 1' },
  { id: '2a', label: 'Light Goods (Van) 2A' },
  { id: '2',  label: 'Light Goods (Van) 2' },
  { id: '3a', label: 'Motorcycle (Auto) 3A' },
  { id: '3',  label: 'Motorcycle (Manual) 3' },
  { id: '6',  label: 'Taxi 6' },
];

export const DEFAULT_VEHICLE_ID = '1a';
export const getVehicleLabel = (id: string) => getLabel(VEHICLE_TYPES, id);

// =========================================
// 2. EXAM CENTERS (With Regions)
// =========================================
export const EXAM_CENTERS = [
  // Kowloon
  { id: 'tin_kwong',    label: 'Tin Kwong Road (Kowloon)',    region: 'Kowloon' },
  { id: 'pui_ching',    label: 'Pui Ching Road (Kowloon)',    region: 'Kowloon' },
  { id: 'chung_yee',    label: 'Chung Yee Street (Kowloon)',  region: 'Kowloon' },
  { id: 'yau_tong',     label: 'Yau Tong (Kowloon)',          region: 'Kowloon' },
  { id: 'chak_on',      label: 'Chak On Road (Kowloon)',      region: 'Kowloon' },
  { id: 'pak_tin',      label: 'Pak Tin (Kowloon)',           region: 'Kowloon' },
  
  // HK Island
  { id: 'happy_valley', label: 'Happy Valley (HK Island)',    region: 'HK Island' },
  { id: 'so_kon_po',    label: 'So Kon Po (HK Island)',       region: 'HK Island' },
  { id: 'ap_lei_chau',  label: 'Ap Lei Chau (HK Island)',     region: 'HK Island' },
  
  // New Territories
  { id: 'wing_hau',     label: 'Wing Hau Street (Kwai Chung)', region: 'New Territories' },
  { id: 'shek_yam',     label: 'Shek Yam (Kwai Chung)',        region: 'New Territories' },
  { id: 'shatin_safe',  label: 'Shatin (Safe Driving Center)', region: 'New Territories' },
  { id: 'yuen_long',    label: 'Yuen Long (Safe Driving Center)', region: 'New Territories' },
  { id: 'tsuen_wan',    label: 'Tsuen Wan (Commercial)',       region: 'New Territories' },
  
  // Motorcycle
  { id: 'duckling_hill',label: 'Duckling Hill (Tseung Kwan O)', region: 'New Territories' },
];

export const getExamCenterLabel = (id: string) => getLabel(EXAM_CENTERS, id);

// =========================================
// 3. EXAM ROUTES (Linked to Centers)
// =========================================
export const EXAM_ROUTES = [
  { id: 'tk_1', centerId: 'tin_kwong', label: 'Tin Kwong Road' },
  { id: 'tk_2', centerId: 'tin_kwong', label: 'Ma Tau Wai Road' },
  { id: 'tk_3', centerId: 'tin_kwong', label: 'To Kwa Wan Road' },

  { id: 'pc_1', centerId: 'pui_ching', label: 'Pui Ching Road' },
  { id: 'pc_2', centerId: 'pui_ching', label: 'Princess Margaret Road' },

  { id: 'hv_1', centerId: 'happy_valley', label: 'Happy Valley' },
  { id: 'hv_2', centerId: 'happy_valley', label: 'Ventris Road' },

  { id: 'ls_1', centerId: 'loyal_st',   label: 'Loyal Street' }, 
  
  { id: 'wh_1', centerId: 'wing_hau',   label: 'Wing Hau Street' },
  { id: 'wh_2', centerId: 'wing_hau',   label: 'Kwai Shing Circuit' },

  { id: 'cy_1', centerId: 'chung_yee',  label: 'Chung Yee Street' },
  { id: 'cy_2', centerId: 'chung_yee',  label: 'Carmel Village Street' },

  { id: 'sy_1', centerId: 'shek_yam',   label: 'Shek Yam' },
  
  { id: 'st_1', centerId: 'shatin_safe', label: 'Shatin Route 1' },
  { id: 'st_2', centerId: 'shatin_safe', label: 'Shatin Route 2' },

  { id: 'yl_1', centerId: 'yuen_long',  label: 'Yuen Long Route 1' },
  { id: 'yl_2', centerId: 'yuen_long',  label: 'Yuen Long Route 2' },

  { id: 'skp_1', centerId: 'so_kon_po',  label: 'So Kon Po' },
  { id: 'skp_2', centerId: 'so_kon_po',  label: 'Caroline Hill Road' },

  { id: 'yt_1', centerId: 'yau_tong',   label: 'Yau Tong' },
  { id: 'yt_2', centerId: 'yau_tong',   label: 'Ko Chiu Road' },

  { id: 'co_1', centerId: 'chak_on',    label: 'Chak On Road' },

  { id: 'pt_1', centerId: 'pak_tin',    label: 'Pak Tin' },

  { id: 'dh_1', centerId: 'duckling_hill', label: 'Duckling Hill' },
  
  { id: 'alc_1', centerId: 'ap_lei_chau', label: 'Ap Lei Chau' },
  
  { id: 'tw_1', centerId: 'tsuen_wan', label: 'Tsuen Wan' },
];

export const getExamRouteLabel = (id: string) => getLabel(EXAM_ROUTES, id);

// =========================================
// 4. LESSON LOCATIONS (Pickups)
// =========================================
export const LESSON_LOCATIONS = [
  { id: 'kowloon_tong', label: 'Kowloon Tong (MTR)' },
  { id: 'sham_shui_po', label: 'Sham Shui Po' },
  { id: 'nam_cheong',   label: 'Nam Cheong' },
  { id: 'pui_ching',    label: 'Pui Ching' },
  { id: 'happy_valley', label: 'Happy Valley' },
  { id: 'tin_kwong',    label: 'Tin Kwong Road' },
  { id: 'yau_tong',     label: 'Yau Tong' },
  { id: 'shatin',       label: 'Shatin' },
  { id: 'yuen_long',    label: 'Yuen Long' },
  { id: 'tsuen_wan',    label: 'Tsuen Wan' },
];
export const getLessonLocationLabel = (id: string) => getLabel(LESSON_LOCATIONS, id);

// =========================================
// 5. BLOCK REASONS
// =========================================
export const BLOCK_REASONS = [
  { id: 'lunch',       label: 'Lunch' },
  { id: 'personal',    label: 'Personal' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'holiday',     label: 'Holiday' },
  { id: 'diu',         label: 'Diu' },
];
export const getBlockReasonLabel = (id: string) => getLabel(BLOCK_REASONS, id);

// =========================================
// 6. DURATIONS
// =========================================
export const LESSON_DURATIONS = [40, 45, 60];

// =========================================
// 7. EXAM CENTER -> PICKUP MAPPING
// =========================================
export const EXAM_CENTER_PICKUPS: Record<string, string[]> = {
  // Kowloon
  'tin_kwong':   ['kowloon_tong', 'tin_kwong'],
  'pui_ching':   ['kowloon_tong', 'pui_ching'],
  'chung_yee':   ['kowloon_tong', 'pui_ching'],
  'yau_tong':    ['yau_tong', 'kowloon_tong'],
  'chak_on':     ['sham_shui_po', 'nam_cheong'],
  'pak_tin':     ['sham_shui_po', 'kowloon_tong'],
  
  // HK Island
  'happy_valley': ['happy_valley'],
  'so_kon_po':    ['happy_valley'],
  'ap_lei_chau':  ['happy_valley'], 
  
  // New Territories
  'wing_hau':    ['nam_cheong', 'sham_shui_po'],
  'shek_yam':    ['nam_cheong'],
  'shatin_safe': ['shatin'],
  'yuen_long':   ['yuen_long'],
  'tsuen_wan':   ['tsuen_wan'],
  
  // Motorcycle
  'duckling_hill': ['yau_tong', 'kowloon_tong'],
};

// =========================================
// 8. [NEW] EXAM REGIONS
// =========================================
// Defines the tabs shown in the Exam Center dropdown filter
export const EXAM_REGIONS = ['All', 'Kowloon', 'HK Island', 'New Territories'];

// =========================================
// 9. [NEW] RESTRICTED TIMES (Learner Driving)
// =========================================
// 0=Sun, 1=Mon, ..., 6=Sat
export const RESTRICTED_HOURS = [
  // Weekdays: 7:30am - 9:30am & 4:30pm - 7:30pm
  { days: [1, 2, 3, 4, 5], start: '07:30', end: '09:30', label: 'Restricted' },
  { days: [1, 2, 3, 4, 5], start: '16:30', end: '19:30', label: 'Restricted' },
  // Saturdays: 7:30am - 9:30am
  { days: [6], start: '07:30', end: '09:30', label: 'Restricted' },
];