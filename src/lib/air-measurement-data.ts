// 대기자가측정 타입 정의 및 초기 데이터

// ========== 타입 ==========

export interface AirFacility {
  id: string;
  serialNumber: string;
  name: string;
  type: string;
  model: string;
  location: string;
  installDate: string;
  status: "정상" | "점검필요" | "고장";
  lastMaintenance: string;
  nextMaintenance: string;
  pollutants: string[];
  measurementCycle: string;
  pollutantLimits: Record<string, string>;
  pollutantCycles: Record<string, string>;
  nextMeasurementDate?: string;
  logs: MaintenanceLog[];
  // 배출구 상세정보
  permitNumber?: string;
  outletType?: string;
  outletCategory?: string;
  outletHeight?: number;
  outletArea?: number;
}

export interface AirSelfMeasurement {
  id: string;
  date: string;
  facilityId: string;
  pollutant: string;
  value: number;
  unit: string;
  limit: number;
  agency: string;
  status: "Pass" | "Fail";
  // 배출 측정 상세
  gasVelocity?: number;
  gasTemperature?: number;
  dataCollectionType?: string;
  measurementPurpose?: string;
  measurementMethod?: string;
  // 추가 측정 데이터
  moisture?: number;            // 수분량(%)
  oxygenActual?: number;        // 실측산소농도(%)
  oxygenStandard?: string;      // 표준산소농도(%)
  gasFlow?: number;             // 배출가스유량(S㎥/min)
  pollutantCoeff?: number;      // 오염물질계수
  convertedConc?: number;       // 환산농도(mg/S㎥)
  limitApplicable?: string;     // 배출허용기준 적용여부 (Y/N)
  hourlyEmission?: number;      // 시간당배출량(g/hr)
  environmentEngineer?: string; // 환경기술인명
  engineerOpinion?: string;     // 환경기술인의견
  inspectionEquipment?: string; // 검사기기명
  inspectionMethod?: string;    // 검사방법내용
  weather?: string;             // 기상구분
  temperature?: number;         // 기온(℃)
  humidity?: number;            // 습도(%)
  airPressure?: number;         // 기압(mmHg)
  windDirection?: string;       // 풍향
  windSpeed?: number;           // 풍속(m/s)
}

export interface MaintenanceLog {
  id: string;
  date: string;
  type: "정기점검" | "긴급수리" | "부품교체" | "소모품보충";
  description: string;
  technician: string;
  cost: number;
}

export interface DetailedImportRecord {
  date: string;
  serial: string;
  facilityName: string;
  pollutant: string;
  value: number;
  limit: number;
  unit: string;
  isExceeded: boolean;
  isRejected?: boolean;
  rejectReason?: string;
}

export interface ImportStatus {
  success: number;
  failed: number;
  msg: string;
  rejectedRecords: DetailedImportRecord[];
  mismatchedRecords: DetailedImportRecord[];
  exceededRecords: DetailedImportRecord[];
  allRecords: DetailedImportRecord[];
}

// ========== 상수 ==========

export const STORAGE_KEYS = {
  MEASUREMENTS: "cosmax_air_measurements",
EQUIPMENTS: "cosmax_air_equipments",
  ACTIVE_SUB_TAB: "cosmax_air_sub_tab",
} as const;

export const POLLUTANT_OPTIONS = [
  "먼지",
  "총탄화수소(THC)",
  "VOCs",
  "벤젠",
  "황산화물(SOx)",
  "질소산화물(NOx)",
  "입자상물질",
  "페놀화합물",
  "아연화합물",
  "구리화합물",
] as const;

export const MEASUREMENT_CYCLES = [
  "매주",
  "매월",
  "분기 1회",
  "반기 1회",
  "연 1회",
] as const;

export const POLLUTANT_COLORS: Record<string, string> = {
  "먼지": "#ef4444",
  "입자상물질": "#f59e0b",
  "총탄화수소(THC)": "#3b82f6",
  "VOCs": "#8b5cf6",
  "벤젠": "#10b981",
  "질소산화물(NOx)": "#f97316",
  "황산화물(SOx)": "#0ea5e9",
  "페놀화합물": "#ec4899",
  "아연화합물": "#14b8a6",
  "구리화합물": "#b45309",
  Default: "#64748b",
};

export const MAINTENANCE_TYPES = [
  "정기점검",
  "긴급수리",
  "부품교체",
  "소모품보충",
] as const;

export const FACILITY_TYPES = ["집진시설", "흡수시설", "소음방지"] as const;

// ========== 초기 데이터 ==========

export const INITIAL_FACILITIES: AirFacility[] = [
  {
    id: "EQ-ENV-001",
    serialNumber: "7",
    name: "보일러 1호기",
    type: "집진시설",
    model: "Boiler-Type-A",
    location: "동측 보일러실",
    installDate: "2022-03-15",
    status: "정상",
    lastMaintenance: "2024-04-10",
    nextMaintenance: "2024-10-10",
    pollutants: ["먼지", "질소산화물(NOx)", "황산화물(SOx)"],
    measurementCycle: "반기 1회",
    pollutantLimits: {
      "먼지": "30",
      "질소산화물(NOx)": "60",
      "황산화물(SOx)": "70",
    },
    pollutantCycles: {
      "먼지": "반기 1회",
      "질소산화물(NOx)": "반기 1회",
      "황산화물(SOx)": "연 1회",
    },
    nextMeasurementDate: "2024-06-15",
    logs: [],
    permitNumber: "보일러",
    outletType: "원형배출구",
    outletCategory: "4종",
    outletHeight: 9.9,
    outletArea: 0.418,
  },
  {
    id: "EQ-ENV-002",
    serialNumber: "9",
    name: "기초2제조실 (560)",
    type: "집진시설",
    model: "Filter-AC-Hybrid",
    location: "제조2동 옥상",
    installDate: "2021-08-20",
    status: "정상",
    lastMaintenance: "2024-05-20",
    nextMaintenance: "2024-08-20",
    pollutants: ["먼지", "질소산화물(NOx)", "황산화물(SOx)", "페놀화합물", "아연화합물", "구리화합물", "총탄화수소(THC)"],
    measurementCycle: "매월",
    pollutantLimits: {
      "먼지": "30",
      "질소산화물(NOx)": "150",
      "황산화물(SOx)": "200",
      "페놀화합물": "4",
      "아연화합물": "4",
      "구리화합물": "4",
      "총탄화수소(THC)": "0",
    },
    pollutantCycles: {
      "먼지": "매월",
      "질소산화물(NOx)": "매월",
      "황산화물(SOx)": "매월",
      "페놀화합물": "분기 1회",
      "아연화합물": "반기 1회",
      "구리화합물": "반기 1회",
      "총탄화수소(THC)": "매월",
    },
    logs: [],
    permitNumber: "(1차) 여과집진시설 (2차) 흡착에의한시설(방-7)",
    outletType: "원형배출구",
    outletCategory: "4종",
    outletHeight: 6.5,
    outletArea: 0.785,
  },
  {
    id: "EQ-ENV-003",
    serialNumber: "11",
    name: "칭량실/저온실 계량시설 200",
    type: "집진시설",
    model: "여과집진시설(방-10)",
    location: "칭량실/저온실",
    installDate: "2021-01-01",
    status: "정상",
    lastMaintenance: "2024-06-01",
    nextMaintenance: "2025-06-01",
    pollutants: ["먼지"],
    measurementCycle: "연 1회",
    pollutantLimits: {
      "먼지": "30",
    },
    pollutantCycles: {
      "먼지": "연 1회",
    },
    logs: [],
    permitNumber: "여과집진시설(방-10)",
    outletType: "원형배출구",
    outletCategory: "5종",
    outletHeight: 1,
    outletArea: 0.196,
  },
  {
    id: "EQ-ENV-004",
    serialNumber: "12",
    name: "파우더실/저온실 계량시설 200",
    type: "집진시설",
    model: "여과집진시설(방-11)",
    location: "파우더실/저온실",
    installDate: "2021-01-01",
    status: "정상",
    lastMaintenance: "2024-06-01",
    nextMaintenance: "2025-06-01",
    pollutants: ["먼지"],
    measurementCycle: "연 1회",
    pollutantLimits: {
      "먼지": "30",
    },
    pollutantCycles: {
      "먼지": "연 1회",
    },
    logs: [],
    permitNumber: "여과집진시설(방-11)",
    outletType: "원형배출구",
    outletCategory: "5종",
    outletHeight: 1,
    outletArea: 0.196,
  },
  {
    id: "EQ-ENV-005",
    serialNumber: "13",
    name: "기초1제조실(250)",
    type: "집진시설",
    model: "여과집진+흡착(방-9)",
    location: "기초1제조실",
    installDate: "2021-01-01",
    status: "정상",
    lastMaintenance: "2024-06-01",
    nextMaintenance: "2025-06-01",
    pollutants: ["먼지", "질소산화물(NOx)", "황산화물(SOx)", "페놀화합물", "아연화합물", "구리화합물", "총탄화수소(THC)"],
    measurementCycle: "매월",
    pollutantLimits: {
      "먼지": "30",
      "질소산화물(NOx)": "150",
      "황산화물(SOx)": "200",
      "페놀화합물": "4",
      "아연화합물": "4",
      "구리화합물": "4",
      "총탄화수소(THC)": "0",
    },
    pollutantCycles: {
      "먼지": "매월",
      "질소산화물(NOx)": "매월",
      "황산화물(SOx)": "매월",
      "페놀화합물": "분기 1회",
      "아연화합물": "반기 1회",
      "구리화합물": "반기 1회",
      "총탄화수소(THC)": "매월",
    },
    logs: [],
    permitNumber: "(1차)여과집진시설 (2차)흡착에 의한시설 (방-9)",
    outletType: "원형배출구",
    outletCategory: "5종",
    outletHeight: 6.7,
    outletArea: 0.385,
  },
  {
    id: "EQ-ENV-006",
    serialNumber: "14",
    name: "기초1제조실 100",
    type: "집진시설",
    model: "여과집진+흡착(방-12)",
    location: "기초1제조실",
    installDate: "2021-01-01",
    status: "정상",
    lastMaintenance: "2024-06-01",
    nextMaintenance: "2025-06-01",
    pollutants: ["먼지", "질소산화물(NOx)", "황산화물(SOx)", "페놀화합물", "구리화합물", "총탄화수소(THC)"],
    measurementCycle: "매월",
    pollutantLimits: {
      "먼지": "30",
      "질소산화물(NOx)": "150",
      "황산화물(SOx)": "200",
      "페놀화합물": "4",
      "구리화합물": "4",
      "총탄화수소(THC)": "0",
    },
    pollutantCycles: {
      "먼지": "매월",
      "질소산화물(NOx)": "매월",
      "황산화물(SOx)": "매월",
      "페놀화합물": "분기 1회",
      "구리화합물": "반기 1회",
      "총탄화수소(THC)": "매월",
    },
    logs: [],
    permitNumber: "(1차)여과집진시설 (2차)흡착에 의한시설 (방-12)",
    outletType: "원형배출구",
    outletCategory: "5종",
    outletHeight: 1.2,
    outletArea: 0.246,
  },
  {
    id: "EQ-ENV-007",
    serialNumber: "17",
    name: "보일러1-2",
    type: "집진시설",
    model: "Boiler-Type-B",
    location: "동측 보일러실",
    installDate: "2022-01-01",
    status: "정상",
    lastMaintenance: "2024-04-10",
    nextMaintenance: "2024-10-10",
    pollutants: ["먼지", "질소산화물(NOx)", "황산화물(SOx)"],
    measurementCycle: "반기 1회",
    pollutantLimits: {
      "먼지": "30",
      "질소산화물(NOx)": "60",
      "황산화물(SOx)": "70",
    },
    pollutantCycles: {
      "먼지": "반기 1회",
      "질소산화물(NOx)": "반기 1회",
      "황산화물(SOx)": "연 1회",
    },
    logs: [],
    permitNumber: "보일러",
    outletType: "원형배출구",
    outletCategory: "4종",
    outletHeight: 9.9,
    outletArea: 0.418,
  },
  {
    id: "EQ-ENV-008",
    serialNumber: "18",
    name: "보일러5-2",
    type: "집진시설",
    model: "Boiler-Type-C",
    location: "서측 보일러실",
    installDate: "2022-01-01",
    status: "정상",
    lastMaintenance: "2024-04-10",
    nextMaintenance: "2024-10-10",
    pollutants: ["먼지", "질소산화물(NOx)", "황산화물(SOx)"],
    measurementCycle: "반기 1회",
    pollutantLimits: {
      "먼지": "30",
      "질소산화물(NOx)": "60",
      "황산화물(SOx)": "70",
    },
    pollutantCycles: {
      "먼지": "반기 1회",
      "질소산화물(NOx)": "반기 1회",
      "황산화물(SOx)": "연 1회",
    },
    logs: [],
    permitNumber: "보일러",
    outletType: "원형배출구",
    outletCategory: "4종",
    outletHeight: 3.5,
    outletArea: 0.107,
  },
];

export const DATA_COLLECTION_TYPES = ["측정인", "전자", "TMS"] as const;
export const MEASUREMENT_PURPOSES = ["제출용", "자체보관용"] as const;
export const MEASUREMENT_METHODS = ["대행의뢰", "자가측정"] as const;
export const OUTLET_TYPES = ["원형배출구", "사각배출구"] as const;
export const OUTLET_CATEGORIES = ["1종", "2종", "3종", "4종", "5종"] as const;
