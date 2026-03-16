"use client";

import { useState, useMemo, useRef } from "react";
import {
  Activity,
  Plus,
  FileUp,
  FileType,
  Save,
  Upload,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  Search,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RotateCcw,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { FacilitySelector } from "./facility-selector";
import type {
  AirFacility,
  AirSelfMeasurement,
  DetailedImportRecord,
  ImportStatus,
} from "@/lib/air-measurement-data";
import { cn } from "@/lib/utils";

interface MeasureTabProps {
  facilities: AirFacility[];
  measurements: AirSelfMeasurement[];
  selectedId: string;
  onSelectFacility: (id: string) => void;
  onAddMeasurements: (items: AirSelfMeasurement[]) => void;
  onUpdateMeasurement: (updated: AirSelfMeasurement) => void;
  onDeleteMeasurements: (ids: string[]) => void;
}

const BUSINESS_NUMBER = "143-81-19635";
const DISTRICT_NUMBER = "4";
const BUSINESS_NAME = "코스맥스(주) 1공장";

export function MeasureTab({
  facilities,
  measurements,
  selectedId,
  onSelectFacility,
  onAddMeasurements,
  onUpdateMeasurement,
  onDeleteMeasurements,
}: MeasureTabProps) {
  const safeMs = measurements || [];
  const activeParent =
    facilities.find((f) => f.id === selectedId) || facilities[0];

  // 입력/업로드 상태
  const [isMeasurementModalOpen, setIsMeasurementModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [measureDate, setMeasureDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [batchMeasureForm, setBatchMeasureForm] = useState<
    Record<string, { value: string; limit: string }>
  >({});
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 수정 모달 상태
  const [editingMeasurement, setEditingMeasurement] = useState<AirSelfMeasurement | null>(null);
  const [editForm, setEditForm] = useState<Partial<AirSelfMeasurement>>({});

  // 체크박스 선택 상태
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState<Partial<AirSelfMeasurement>>({});

  // 조회 테이블 상태
  const currentYear = new Date().getFullYear();
  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterPermitNumber, setFilterPermitNumber] = useState("");
  const [filterExpanded, setFilterExpanded] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState({
    year: String(currentYear),
    dateFrom: "",
    dateTo: "",
    permitNumber: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // ===== 입력/업로드 로직 =====

  const handleSaveBatchMeasurement = () => {
    const entries = Object.entries(batchMeasureForm);
    const newEntries: AirSelfMeasurement[] = entries
      .filter(([, data]) => data.value)
      .map(([p, data]) => ({
        id: `M-${Date.now()}-${p}`,
        date: measureDate,
        facilityId: selectedId,
        pollutant: p,
        value: parseFloat(data.value || "0"),
        unit: p === "총탄화수소(THC)" ? "ppm" : "mg/m3",
        limit: parseFloat(data.limit || "20"),
        status:
          parseFloat(data.value || "0") <= parseFloat(data.limit || "20")
            ? ("Pass" as const)
            : ("Fail" as const),
      }));
    if (newEntries.length > 0) {
      onAddMeasurements(newEntries);
      setIsMeasurementModalOpen(false);
      setBatchMeasureForm({});
      toast.success(`${newEntries.length}건의 측정 데이터가 저장되었습니다`);
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(filteredData.map((r) => r.id)));
    else setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    const count = selectedIds.size;
    onDeleteMeasurements([...selectedIds]);
    setSelectedIds(new Set());
    toast.success(`${count}건이 삭제되었습니다`);
  };

  const handleEditSelected = () => {
    if (selectedIds.size === 1) {
      const m = filteredData.find((r) => r.id === [...selectedIds][0]);
      if (m) { setEditingMeasurement(m); setEditForm({ ...m }); }
    } else {
      setBulkEditForm({});
      setIsBulkEditOpen(true);
    }
  };

  const handleSaveBulkEdit = () => {
    const count = selectedIds.size;
    [...selectedIds].forEach((id) => {
      const m = measurements.find((m) => m.id === id);
      if (!m) return;
      onUpdateMeasurement({ ...m, ...bulkEditForm });
    });
    setSelectedIds(new Set());
    setIsBulkEditOpen(false);
    toast.success(`${count}건이 수정되었습니다`);
  };

  const handleOpenEdit = (m: AirSelfMeasurement, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMeasurement(m);
    setEditForm({ ...m });
  };

  const handleSaveEdit = () => {
    if (!editingMeasurement) return;
    const value = parseFloat(String(editForm.value ?? editingMeasurement.value));
    const limit = parseFloat(String(editForm.limit ?? editingMeasurement.limit));
    const updated: AirSelfMeasurement = {
      ...editingMeasurement,
      ...editForm,
      value,
      limit,
      status: value > limit ? "Fail" : "Pass",
    };
    onUpdateMeasurement(updated);
    setEditingMeasurement(null);
    toast.success("수정되었습니다");
  };

  const processImportData = (rows: unknown[][]) => {
    const newMeasurements: AirSelfMeasurement[] = [];
    const exceededRecords: DetailedImportRecord[] = [];
    const rejectedRecords: DetailedImportRecord[] = [];
    const mismatchedRecords: DetailedImportRecord[] = [];
    const allRecords: DetailedImportRecord[] = [];
    let successCount = 0;
    let failedCount = 0;

    rows.slice(1).forEach((cols, idx) => {
      if (!cols || cols.length < 20) return;
      const serialInFile = String(cols[1] || "").trim();
      const dateInFile = String(cols[8] || "").trim();
      // 배출가스 속도(13), 온도(14), 수분량(15), 산소농도(16,17), 유량(18)
      const gasVelocity = parseFloat(String(cols[13] || "0")) || undefined;
      const gasTemperature = parseFloat(String(cols[14] || "0")) || undefined;
      const moisture = parseFloat(String(cols[15] || "0")) || undefined;
      const oxygenActual = parseFloat(String(cols[16] || "0")) || undefined;
      const oxygenStandard = String(cols[17] || "").trim() || undefined;
      const gasFlow = parseFloat(String(cols[18] || "0")) || undefined;
      // 오염물질명(19), 계수(20), 농도(23), 단위(24), 환산농도(25)
      let pollutantName = String(cols[19] || "").trim();
      const pollutantCoeff = parseFloat(String(cols[20] || "0")) || undefined;
      const concentration = parseFloat(String(cols[23] || "0"));
      const unit = String(cols[24] || "mg/S㎥").trim();
      const convertedConc = parseFloat(String(cols[25] || "0")) || undefined;
      // 배출허용기준 적용여부(26), 기준농도(27), 시간당배출량(29)
      const limitApplicable = String(cols[26] || "").trim() || undefined;
      const limitInFile = parseFloat(String(cols[27] || "30"));
      const hourlyEmission = parseFloat(String(cols[29] || "0")) || undefined;
      // 환경기술인명(32), 의견(33), 검사기기(34), 검사방법(35)
      const environmentEngineer = String(cols[32] || "").trim() || undefined;
      const engineerOpinion = String(cols[33] || "").trim() || undefined;
      const inspectionEquipment = String(cols[34] || "").trim() || undefined;
      const inspectionMethod = String(cols[35] || "").trim() || undefined;
      // 기상(36), 기온(37), 습도(38), 기압(39), 풍향(40), 풍속(41)
      const weather = String(cols[36] || "").trim() || undefined;
      const temperature = cols[37] !== undefined && cols[37] !== null ? parseFloat(String(cols[37])) : undefined;
      const humidity = cols[38] !== undefined && cols[38] !== null ? parseFloat(String(cols[38])) : undefined;
      const airPressure = parseFloat(String(cols[39] || "0")) || undefined;
      const windDirection = String(cols[40] || "").trim() || undefined;
      const windSpeed = cols[41] !== undefined && cols[41] !== null ? parseFloat(String(cols[41])) : undefined;

      if (!serialInFile || !pollutantName) return;
      if (pollutantName === "황산화물") pollutantName = "황산화물(SOx)";
      if (pollutantName === "질소산화물") pollutantName = "질소산화물(NOx)";
      if (pollutantName === "THC" || pollutantName === "총탄화수소")
        pollutantName = "총탄화수소(THC)";

      const formattedDate =
        dateInFile.length === 8
          ? `${dateInFile.substring(0, 4)}-${dateInFile.substring(4, 6)}-${dateInFile.substring(6, 8)}`
          : dateInFile;

      const matchedEquip = facilities.find(
        (e) => e.serialNumber === serialInFile
      );

      if (matchedEquip) {
        const sysLimit = matchedEquip.pollutantLimits?.[pollutantName]
          ? parseFloat(matchedEquip.pollutantLimits[pollutantName])
          : limitInFile;
        const isExceeded = concentration > sysLimit;
        const isPollutantRegistered =
          matchedEquip.pollutants?.includes(pollutantName);

        const record: DetailedImportRecord = {
          date: formattedDate,
          serial: serialInFile,
          facilityName: matchedEquip.name,
          pollutant: pollutantName,
          value: concentration,
          limit: sysLimit,
          unit,
          isExceeded,
          isRejected: !isPollutantRegistered,
          rejectReason: !isPollutantRegistered
            ? "해당 시설에 등록되지 않은 오염물질"
            : undefined,
        };
        allRecords.push(record);

        if (!isPollutantRegistered) {
          rejectedRecords.push(record);
          failedCount++;
          return;
        }
        if (isExceeded) exceededRecords.push(record);

        newMeasurements.push({
          id: `M-UP-${Date.now()}-${idx}`,
          date: formattedDate,
          facilityId: matchedEquip.id,
          pollutant: pollutantName,
          value: concentration,
          unit,
          limit: sysLimit,
          status: isExceeded ? "Fail" : "Pass",
          gasVelocity,
          gasTemperature,
          moisture,
          oxygenActual,
          oxygenStandard,
          gasFlow,
          pollutantCoeff,
          convertedConc,
          limitApplicable,
          hourlyEmission,
          environmentEngineer,
          engineerOpinion,
          inspectionEquipment,
          inspectionMethod,
          weather,
          temperature,
          humidity,
          airPressure,
          windDirection,
          windSpeed,
        });
        successCount++;
      } else {
        const record: DetailedImportRecord = {
          date: formattedDate,
          serial: serialInFile,
          facilityName: "미등록 시설",
          pollutant: pollutantName,
          value: concentration,
          limit: limitInFile,
          unit,
          isExceeded: false,
          isRejected: true,
          rejectReason: "일련번호 불일치",
        };
        mismatchedRecords.push(record);
        allRecords.push(record);
        failedCount++;
      }
    });

    if (newMeasurements.length > 0) onAddMeasurements(newMeasurements);

    setImportStatus({
      success: successCount,
      failed: failedCount,
      msg:
        successCount > 0
          ? `파일 업로드가 완료되었습니다. 총 ${successCount}건의 데이터가 반영되었습니다.`
          : "반영할 수 있는 유효한 데이터가 없습니다.",
      rejectedRecords,
      mismatchedRecords,
      exceededRecords,
      allRecords,
    });
  };

  const handleProcessFileUpload = () => {
    if (!uploadFile) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      let jsonData: unknown[][] = [];
      try {
        if (uploadFile.name.endsWith(".xlsx")) {
          const workbook = XLSX.read(data, { type: "binary" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
          }) as unknown[][];
        } else {
          const text = new TextDecoder("utf-8").decode(data as ArrayBuffer);
          jsonData = text
            .split("\n")
            .map((line) =>
              line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
            );
        }
        processImportData(jsonData);
      } catch {
        setImportStatus({
          success: 0,
          failed: 0,
          msg: "파일 분석 오류가 발생했습니다.",
          mismatchedRecords: [],
          exceededRecords: [],
          allRecords: [],
          rejectedRecords: [],
        });
      } finally {
        setIsUploading(false);
      }
    };
    if (uploadFile.name.endsWith(".xlsx")) {
      reader.readAsBinaryString(uploadFile);
    } else {
      reader.readAsArrayBuffer(uploadFile);
    }
  };

  // ===== 조회 테이블 로직 =====

  const handleSearchFilter = () => {
    setAppliedFilters({
      year: filterYear,
      dateFrom: filterDateFrom,
      dateTo: filterDateTo,
      permitNumber: filterPermitNumber,
    });
    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setFilterYear(String(currentYear));
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterPermitNumber("");
    setAppliedFilters({
      year: String(currentYear),
      dateFrom: "",
      dateTo: "",
      permitNumber: "",
    });
    setCurrentPage(1);
  };

  const tableData = useMemo(() => {
    return safeMs
      .map((m) => {
        const facility = facilities.find((f) => f.id === m.facilityId);
        if (!facility) return null;
        return { ...m, year: new Date(m.date).getFullYear(), facility };
      })
      .filter(Boolean) as (AirSelfMeasurement & {
      year: number;
      facility: AirFacility;
    })[];
  }, [safeMs, facilities]);

  const filteredData = useMemo(() => {
    return tableData
      .filter((row) => {
        if (appliedFilters.year && row.year !== parseInt(appliedFilters.year))
          return false;
        if (appliedFilters.dateFrom && row.date < appliedFilters.dateFrom)
          return false;
        if (appliedFilters.dateTo && row.date > appliedFilters.dateTo)
          return false;
        if (
          appliedFilters.permitNumber &&
          row.facility.permitNumber !== appliedFilters.permitNumber
        )
          return false;
        return true;
      })
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
  }, [tableData, appliedFilters]);

  const handleTableExcelDownload = () => {
    if (filteredData.length === 0) {
      toast.error("다운로드할 데이터가 없습니다");
      return;
    }
    const data = filteredData.map((row, idx) => ({
      번호: idx + 1,
      조사년도: row.year,
      "배출구 일련번호": row.facility.serialNumber,
      "허가증상 배출구번호": row.facility.permitNumber || "",
      배출구명: row.facility.name,
      측정일자: row.date,
      "배출가스속도(m/s)": row.gasVelocity ?? "",
      "배출가스온도(°C)": row.gasTemperature ?? "",
      "수분량(%)": row.moisture ?? "",
      "실측산소농도(%)": row.oxygenActual ?? "",
      "표준산소농도(%)": row.oxygenStandard ?? "",
      "배출가스유량(S㎥/min)": row.gasFlow ?? "",
      오염물질명: row.pollutant,
      오염물질계수: row.pollutantCoeff ?? "",
      "오염물질농도": row.value,
      "오염물질농도단위": row.unit,
      "환산농도(mg/S㎥)": row.convertedConc ?? "",
      배출허용기준적용여부: row.limitApplicable ?? "",
      배출허용기준농도: row.limit,
      "시간당배출량(g/hr)": row.hourlyEmission ?? "",
      환경기술인명: row.environmentEngineer || "",
      환경기술인의견: row.engineerOpinion || "",
      검사기기명: row.inspectionEquipment || "",
      검사방법내용: row.inspectionMethod || "",
      기상구분: row.weather || "",
      "기온(℃)": row.temperature ?? "",
      "습도(%)": row.humidity ?? "",
      "기압(mmHg)": row.airPressure ?? "",
      풍향: row.windDirection || "",
      "풍속(m/s)": row.windSpeed ?? "",
      판정: row.status === "Pass" ? "적합" : "초과",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "자가측정사항");
    XLSX.writeFile(
      wb,
      `자가측정사항_${appliedFilters.year}_${new Date().toISOString().split("T")[0]}.xlsx`
    );
    toast.success("엑셀 파일이 다운로드되었습니다");
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const pagedData = filteredData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const permitNumberOptions = useMemo(() => {
    const nums = facilities
      .map((f) => f.permitNumber)
      .filter((v): v is string => !!v);
    return [...new Set(nums)].sort();
  }, [facilities]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">자가측정사항</h2>

      {/* 필터 */}
      <div className="border rounded-lg bg-white">
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{BUSINESS_NAME}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Label className="w-24 text-xs font-semibold text-muted-foreground shrink-0 bg-muted px-2 py-1.5 rounded text-center">
                  조사년도
                </Label>
                <Select value={filterYear} onValueChange={(v) => setFilterYear(v ?? "")}>
                  <SelectTrigger className="w-32 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}년
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {filterExpanded && (
                <div className="flex items-center gap-3">
                  <Label className="w-24 text-xs font-semibold text-muted-foreground shrink-0 bg-muted px-2 py-1.5 rounded text-center">
                    측정기간
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="date"
                      className="h-8 text-sm w-36"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                    />
                    <span className="text-muted-foreground text-sm">~</span>
                    <Input
                      type="date"
                      className="h-8 text-sm w-36"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {filterExpanded && (
                <>
                  <div className="flex items-center gap-3">
                    <Label className="w-24 text-xs font-semibold text-muted-foreground shrink-0 bg-muted px-2 py-1.5 rounded text-center">
                      허가증상<br />배출구번호
                    </Label>
                    <Select
                      value={filterPermitNumber}
                      onValueChange={(v) => setFilterPermitNumber(v ?? "")}
                    >
                      <SelectTrigger className="w-96 h-auto min-h-8 text-sm whitespace-normal text-left">
                        <SelectValue placeholder="전체" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[420px]">
                        <SelectItem value="">전체</SelectItem>
                        {permitNumberOptions.map((p) => (
                          <SelectItem key={p} value={p} className="whitespace-normal break-words">
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </div>

          {filterExpanded && (
            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleResetFilter}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                초기화
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-[#1e3a5f] hover:bg-[#2a4a72]"
                onClick={handleSearchFilter}
              >
                <Search className="h-3.5 w-3.5" />
                검색
              </Button>
            </div>
          )}
        </div>

        <button
          onClick={() => setFilterExpanded(!filterExpanded)}
          className="w-full py-1.5 border-t flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          {filterExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* 결과 헤더 */}
      <div className="flex items-center justify-between">
        <p className="text-sm">
          총{" "}
          <span className="text-blue-600 font-bold">
            {filteredData.length}
          </span>
          건이 조회되었습니다.
          {selectedIds.size > 0 && (
            <span className="ml-2 text-primary font-semibold">
              ({selectedIds.size}건 선택됨)
            </span>
          )}
        </p>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-primary text-primary hover:bg-primary/10"
                onClick={handleEditSelected}
              >
                <Pencil className="h-3.5 w-3.5" />
                {selectedIds.size === 1 ? "수정" : "일괄 수정"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-destructive text-destructive hover:bg-destructive/10"
                onClick={handleDeleteSelected}
              >
                <Trash2 className="h-3.5 w-3.5" />
                삭제 ({selectedIds.size})
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setIsCsvModalOpen(true)}
          >
            <FileUp className="h-3.5 w-3.5" />
            파일 업로드
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleTableExcelDownload}
          >
            <Download className="h-3.5 w-3.5" />
            엑셀다운로드
          </Button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/70">
                <TableHead className="w-10 text-center">
                  <Checkbox
                    checked={filteredData.length > 0 && selectedIds.size === filteredData.length}
                    onCheckedChange={(v) => handleSelectAll(!!v)}
                  />
                </TableHead>
                <TableHead className="w-10 text-center text-xs font-semibold whitespace-nowrap">
                  &nbsp;
                </TableHead>
                <TableHead className="text-center text-xs font-semibold whitespace-nowrap">
                  조사년도
                </TableHead>
                <TableHead className="text-center text-xs font-semibold whitespace-nowrap">
                  배출구
                  <br />
                  일련번호
                </TableHead>
                <TableHead className="text-center text-xs font-semibold whitespace-nowrap min-w-[220px]">
                  허가증상
                  <br />
                  배출구번호
                </TableHead>
                <TableHead className="text-center text-xs font-semibold whitespace-nowrap">
                  배출구명
                </TableHead>
                <TableHead className="text-center text-xs font-semibold whitespace-nowrap">
                  측정일자
                </TableHead>
                <TableHead className="text-center text-xs font-semibold whitespace-nowrap">
                  배출가스
                  <br />
                  속도(m/s)
                </TableHead>
                <TableHead className="text-center text-xs font-semibold whitespace-nowrap">
                  배출가스
                  <br />
                  온도(°C)
                </TableHead>
                <TableHead className="text-center text-xs font-semibold whitespace-nowrap">
                  배출가스
                  <br />
                  유량(S㎥/min)
                </TableHead>
                <TableHead className="text-center text-xs font-semibold whitespace-nowrap">
                  오염물질
                </TableHead>
                <TableHead className="text-center text-xs font-semibold whitespace-nowrap">
                  측정값
                </TableHead>
                <TableHead className="text-center text-xs font-semibold whitespace-nowrap">
                  법적기준
                </TableHead>
                <TableHead className="text-center text-xs font-semibold whitespace-nowrap">
                  판정
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={15}
                    className="h-32 text-center text-muted-foreground"
                  >
                    조회된 데이터가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                pagedData.map((row, idx) => {
                  const isExpanded = expandedRow === row.id;
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "hover:bg-blue-50/50 cursor-pointer text-xs",
                        isExpanded && "bg-blue-50/70",
                        selectedIds.has(row.id) && "bg-blue-50",
                        idx === 0 && !selectedIds.has(row.id) && "bg-indigo-50/50"
                      )}
                      onClick={() =>
                        setExpandedRow(isExpanded ? null : row.id)
                      }
                    >
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onCheckedChange={() =>
                            handleToggleSelect(row.id, { stopPropagation: () => {} } as React.MouseEvent)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 mx-auto" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.year}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {row.facility.serialNumber}
                      </TableCell>
                      <TableCell className="text-center text-xs min-w-[220px]">
                        {row.facility.permitNumber || "-"}
                      </TableCell>
                      <TableCell className="text-center text-xs max-w-[160px] truncate">
                        {row.facility.name}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {row.date}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.gasVelocity ?? "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.gasTemperature ?? "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.gasFlow ?? "-"}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {row.pollutant}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-center font-semibold",
                          row.status === "Fail" && "text-red-600"
                        )}
                      >
                        {row.value}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.limit}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            row.status === "Pass"
                              ? "default"
                              : "destructive"
                          }
                          className={cn(
                            "text-[10px]",
                            row.status === "Pass" &&
                              "bg-green-100 text-green-700 hover:bg-green-100"
                          )}
                        >
                          {row.status === "Pass" ? "적합" : "초과"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 페이지네이션 */}
      {filteredData.length > 0 && (
        <div className="flex flex-col items-center gap-2 text-sm">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
            >
              «
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              ‹
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .reduce<(number | "...")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground">…</span>
                ) : (
                  <Button
                    key={p}
                    variant={currentPage === p ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(p as number)}
                  >
                    {p}
                  </Button>
                )
              )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              ›
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
            >
              »
            </Button>
          </div>
          <span className="text-muted-foreground">
            {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredData.length)} / {filteredData.length}건
          </span>
        </div>
      )}

      {/* =============== 일괄 수정 모달 =============== */}
      <Dialog open={isBulkEditOpen} onOpenChange={setIsBulkEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              일괄 수정 ({selectedIds.size}건)
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">입력한 항목만 선택된 데이터에 일괄 적용됩니다.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">측정일자</Label>
              <Input type="date" value={bulkEditForm.date ?? ""} onChange={(e) => setBulkEditForm(f => ({ ...f, date: e.target.value || undefined }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">환경기술인명</Label>
              <Input value={bulkEditForm.environmentEngineer ?? ""} onChange={(e) => setBulkEditForm(f => ({ ...f, environmentEngineer: e.target.value || undefined }))} placeholder="이름 입력" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsBulkEditOpen(false)}>취소</Button>
            <Button onClick={handleSaveBulkEdit}>
              <Save className="h-4 w-4 mr-1" />
              일괄 저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =============== 수정 모달 =============== */}
      <Dialog open={!!editingMeasurement} onOpenChange={(open) => { if (!open) setEditingMeasurement(null); }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              측정 데이터 수정
            </DialogTitle>
          </DialogHeader>
          {editingMeasurement && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                <p><span className="text-muted-foreground">시설:</span> {facilities.find(f => f.id === editingMeasurement.facilityId)?.name} (S/N: {facilities.find(f => f.id === editingMeasurement.facilityId)?.serialNumber})</p>
                <p><span className="text-muted-foreground">오염물질:</span> {editingMeasurement.pollutant}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">측정일자</Label>
                  <Input type="date" value={editForm.date ?? ""} onChange={(e) => setEditForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">측정값 ({editingMeasurement.unit})</Label>
                  <Input type="number" value={editForm.value ?? ""} onChange={(e) => setEditForm(f => ({ ...f, value: parseFloat(e.target.value) }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">법적기준 ({editingMeasurement.unit})</Label>
                  <Input type="number" value={editForm.limit ?? ""} onChange={(e) => setEditForm(f => ({ ...f, limit: parseFloat(e.target.value) }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">배출가스유량 (S㎥/min)</Label>
                  <Input type="number" value={editForm.gasFlow ?? ""} onChange={(e) => setEditForm(f => ({ ...f, gasFlow: parseFloat(e.target.value) || undefined }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">배출가스속도 (m/s)</Label>
                  <Input type="number" value={editForm.gasVelocity ?? ""} onChange={(e) => setEditForm(f => ({ ...f, gasVelocity: parseFloat(e.target.value) || undefined }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">배출가스온도 (°C)</Label>
                  <Input type="number" value={editForm.gasTemperature ?? ""} onChange={(e) => setEditForm(f => ({ ...f, gasTemperature: parseFloat(e.target.value) || undefined }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">환경기술인명</Label>
                  <Input value={editForm.environmentEngineer ?? ""} onChange={(e) => setEditForm(f => ({ ...f, environmentEngineer: e.target.value || undefined }))} placeholder="이름 입력" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingMeasurement(null)}>취소</Button>
                <Button onClick={handleSaveEdit}>
                  <Save className="h-4 w-4 mr-1" />
                  저장
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* =============== 직접 입력 모달 =============== */}
      <Dialog
        open={isMeasurementModalOpen}
        onOpenChange={setIsMeasurementModalOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              자가측정 데이터 입력
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>측정 일자</Label>
              <Input
                type="date"
                value={measureDate}
                onChange={(e) => setMeasureDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>대상 시설</Label>
              <FacilitySelector
                facilities={facilities}
                selectedId={selectedId}
                onSelect={onSelectFacility}
              />
            </div>
            <div className="text-sm font-medium">
              선택 시설:{" "}
              <span className="text-primary">{activeParent?.name}</span>
              <span className="text-muted-foreground ml-2">
                (S/N: {activeParent?.serialNumber})
              </span>
            </div>
            <div className="space-y-3 max-h-[40vh] overflow-y-auto">
              {activeParent?.pollutants?.map((p) => (
                <div
                  key={p}
                  className="p-3 bg-muted/50 rounded-lg space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{p}</span>
                    <span className="text-xs text-muted-foreground">
                      기준: {activeParent?.pollutantLimits?.[p] || "20"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="측정값"
                      value={batchMeasureForm[p]?.value || ""}
                      onChange={(e) =>
                        setBatchMeasureForm({
                          ...batchMeasureForm,
                          [p]: {
                            value: e.target.value,
                            limit:
                              activeParent?.pollutantLimits?.[p] || "20",
                          },
                        })
                      }
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {p === "총탄화수소(THC)" ? "ppm" : "mg/m3"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsMeasurementModalOpen(false)}
              >
                취소
              </Button>
              <Button onClick={handleSaveBatchMeasurement}>
                <Save className="h-4 w-4 mr-1" />
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* =============== 파일 업로드 모달 =============== */}
      <Dialog
        open={isCsvModalOpen}
        onOpenChange={(open) => {
          setIsCsvModalOpen(open);
          if (!open) {
            setImportStatus(null);
            setUploadFile(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-primary" />
              자가측정 파일 업로드
            </DialogTitle>
          </DialogHeader>

          {!importStatus ? (
            <div className="space-y-4">
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  업로드 시 데이터만 반영되며, 설비 마스터 정보는 변경되지
                  않습니다. 일련번호(S/N)가 일치하지 않거나 미등록 오염물질인
                  경우 데이터 등록이 자동으로 거부됩니다.
                </p>
              </div>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files[0])
                    setUploadFile(e.dataTransfer.files[0]);
                }}
                className={cn(
                  "w-full h-48 border-2 border-dashed rounded-lg transition-all flex flex-col items-center justify-center cursor-pointer",
                  uploadFile
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 bg-muted/30"
                )}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files?.[0])
                      setUploadFile(e.target.files[0]);
                  }}
                  accept=".csv,.xlsx"
                  className="hidden"
                />
                {uploadFile ? (
                  <div className="text-center">
                    <FileType className="h-10 w-10 text-primary mx-auto mb-2" />
                    <p className="font-semibold text-sm">{uploadFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      클릭하거나 파일을 드래그하세요
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      .CSV, .XLSX 지원
                    </p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                {uploadFile && (
                  <Button
                    variant="ghost"
                    onClick={() => setUploadFile(null)}
                  >
                    취소
                  </Button>
                )}
                <Button
                  onClick={handleProcessFileUpload}
                  disabled={!uploadFile || isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Activity className="h-4 w-4 mr-1" />
                  )}
                  {isUploading ? "분석 중..." : "데이터 분석 및 반영"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <div
                  className={cn(
                    "mx-auto w-16 h-16 rounded-full flex items-center justify-center",
                    importStatus.rejectedRecords.length > 0 ||
                      importStatus.exceededRecords.length > 0 ||
                      importStatus.mismatchedRecords.length > 0
                      ? "bg-rose-100 text-rose-600"
                      : "bg-emerald-100 text-emerald-600"
                  )}
                >
                  {importStatus.rejectedRecords.length > 0 ||
                  importStatus.exceededRecords.length > 0 ||
                  importStatus.mismatchedRecords.length > 0 ? (
                    <AlertTriangle className="h-8 w-8" />
                  ) : (
                    <CheckCircle2 className="h-8 w-8" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {importStatus.msg}
                </p>
                <div className="flex justify-center gap-4 text-sm">
                  <span className="text-emerald-600 font-semibold">
                    성공: {importStatus.success}건
                  </span>
                  <span className="text-rose-600 font-semibold">
                    실패: {importStatus.failed}건
                  </span>
                </div>
              </div>

              {importStatus.allRecords.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold mb-2 flex items-center gap-1">
                    <ClipboardList className="h-4 w-4 text-emerald-600" />
                    전체 처리 내역
                  </h5>
                  <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted">
                          <th className="px-3 py-2 text-left">날짜</th>
                          <th className="px-3 py-2 text-left">S/N</th>
                          <th className="px-3 py-2 text-left">오염물질</th>
                          <th className="px-3 py-2 text-right">측정값</th>
                          <th className="px-3 py-2 text-center">상태</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {importStatus.allRecords.map((r, i) => (
                          <tr
                            key={i}
                            className={cn(
                              "hover:bg-muted/50",
                              r.isRejected && "bg-rose-50"
                            )}
                          >
                            <td className="px-3 py-2">{r.date}</td>
                            <td className="px-3 py-2 font-medium">
                              {r.serial}
                            </td>
                            <td className="px-3 py-2">{r.pollutant}</td>
                            <td
                              className={cn(
                                "px-3 py-2 text-right font-medium",
                                r.isExceeded && "text-rose-600"
                              )}
                            >
                              {r.value}{" "}
                              <span className="text-muted-foreground">
                                {r.unit}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Badge
                                variant={
                                  r.isRejected
                                    ? "destructive"
                                    : r.isExceeded
                                      ? "destructive"
                                      : "default"
                                }
                                className={cn(
                                  "text-[10px]",
                                  !r.isRejected &&
                                    !r.isExceeded &&
                                    "bg-green-100 text-green-700 hover:bg-green-100"
                                )}
                              >
                                {r.isRejected
                                  ? "거부"
                                  : r.isExceeded
                                    ? "초과"
                                    : "적합"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {importStatus.rejectedRecords.length > 0 && (
                  <div className="bg-slate-900 text-white p-4 rounded-lg space-y-2">
                    <h5 className="text-xs text-red-400 font-semibold flex items-center gap-1">
                      <ShieldAlert className="h-4 w-4" />
                      미등록 오염물질 (
                      {importStatus.rejectedRecords.length}건)
                    </h5>
                    <div className="space-y-1 max-h-[120px] overflow-y-auto">
                      {importStatus.rejectedRecords.map((r, idx) => (
                        <div
                          key={idx}
                          className="p-2 bg-white/5 rounded text-xs flex justify-between"
                        >
                          <span>
                            {r.date} | S/N: {r.serial}
                          </span>
                          <span>{r.pollutant}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {importStatus.exceededRecords.length > 0 && (
                  <div className="bg-rose-50 p-4 rounded-lg space-y-2 border border-rose-200">
                    <h5 className="text-xs text-rose-700 font-semibold flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      법적기준 초과 (
                      {importStatus.exceededRecords.length}건)
                    </h5>
                    <div className="space-y-1 max-h-[120px] overflow-y-auto">
                      {importStatus.exceededRecords.map((r, idx) => (
                        <div
                          key={idx}
                          className="p-2 bg-white rounded text-xs flex justify-between border border-rose-100"
                        >
                          <span>
                            {r.date} | {r.pollutant}
                          </span>
                          <span className="text-rose-600 font-semibold">
                            {r.value} (기준: {r.limit})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {importStatus.mismatchedRecords.length > 0 && (
                  <div className="bg-orange-50 p-4 rounded-lg space-y-2 border border-orange-200">
                    <h5 className="text-xs text-orange-700 font-semibold flex items-center gap-1">
                      <Search className="h-4 w-4" />
                      미등록 시설 (
                      {importStatus.mismatchedRecords.length}건)
                    </h5>
                    <div className="space-y-1 max-h-[120px] overflow-y-auto">
                      {importStatus.mismatchedRecords.map((r, idx) => (
                        <div
                          key={idx}
                          className="p-2 bg-white rounded text-xs flex justify-between border border-orange-100"
                        >
                          <span>
                            {r.date} | S/N: {r.serial}
                          </span>
                          <span>{r.pollutant}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={() => {
                    setIsCsvModalOpen(false);
                    setImportStatus(null);
                    setUploadFile(null);
                  }}
                >
                  확인
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
