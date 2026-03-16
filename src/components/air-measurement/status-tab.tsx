"use client";

import { useState, useMemo } from "react";
import { Activity, History, CalendarClock, ChevronDown, ChevronUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  LabelList,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FacilitySelector } from "./facility-selector";
import type { AirFacility, AirSelfMeasurement } from "@/lib/air-measurement-data";
import { POLLUTANT_COLORS } from "@/lib/air-measurement-data";
import { cn } from "@/lib/utils";

interface StatusTabProps {
  facilities: AirFacility[];
  measurements: AirSelfMeasurement[];
  selectedId: string;
  onSelectFacility: (id: string) => void;
  onGoToMeasure: (id: string) => void;
  onGoToEquipment: (facility: AirFacility) => void;
}

export function StatusTab({
  facilities,
  measurements,
  selectedId,
  onSelectFacility,
  onGoToMeasure,
  onGoToEquipment,
}: StatusTabProps) {
  const safeMs = measurements || [];
  const activeParent =
    facilities.find((f) => f.id === selectedId) || facilities[0];
  const [chartPollutantFilter, setChartPollutantFilter] = useState("All");

  // 차트 데이터
  const facilityMeasurements = useMemo(
    () =>
      safeMs
        .filter((m) => m.facilityId === selectedId)
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        ),
    [safeMs, selectedId]
  );

  const chartData = useMemo(() => {
    const grouped: Record<string, Record<string, number | string>> = {};
    facilityMeasurements.forEach((m) => {
      if (!grouped[m.date]) grouped[m.date] = { date: m.date };
      grouped[m.date][m.pollutant] = m.value;
    });
    return Object.values(grouped);
  }, [facilityMeasurements]);

  const activePollutants = useMemo(() => {
    const pSet = new Set<string>();
    facilityMeasurements.forEach((m) => pSet.add(m.pollutant));
    if (activeParent?.pollutants)
      activeParent.pollutants.forEach((p) => pSet.add(p));
    return Array.from(pSet);
  }, [facilityMeasurements, activeParent]);

  const yAxisMax = useMemo(() => {
    let maxVal = 0;
    chartData.forEach((d) => {
      activePollutants.forEach((p) => {
        if (chartPollutantFilter === "All" || chartPollutantFilter === p) {
          const val = Number(d[p]) || 0;
          if (val > maxVal) maxVal = val;
        }
      });
    });
    if (
      chartPollutantFilter !== "All" &&
      activeParent?.pollutantLimits?.[chartPollutantFilter]
    ) {
      const limit = parseFloat(
        activeParent.pollutantLimits[chartPollutantFilter]
      );
      if (limit > maxVal) maxVal = limit;
    }
    return maxVal > 0 ? maxVal * 1.25 : 100;
  }, [chartData, activePollutants, chartPollutantFilter, activeParent]);

  const recentMeasurements = useMemo(
    () =>
      safeMs
        .filter((m) => m.facilityId === selectedId)
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
    [safeMs, selectedId]
  );

  // ===== 측정 주기 관리 =====
  const [cycleStatusFilter, setCycleStatusFilter] = useState("전체");
  const [cycleTableOpen, setCycleTableOpen] = useState(true);

  const cycleRows = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 주기별 기간 경계 계산 (date가 속하는 기간의 시작/끝)
    function getPeriodBoundaries(cycle: string, date: Date): { start: Date; end: Date } {
      const y = date.getFullYear();
      const m = date.getMonth();
      switch (cycle) {
        case "매주": {
          const dow = date.getDay();
          const start = new Date(date);
          start.setDate(date.getDate() - (dow === 0 ? 6 : dow - 1));
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(start.getDate() + 6);
          return { start, end };
        }
        case "매월":
          return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0) };
        case "분기 1회": {
          const q = Math.floor(m / 3);
          return { start: new Date(y, q * 3, 1), end: new Date(y, q * 3 + 3, 0) };
        }
        case "반기 1회":
          return m < 6
            ? { start: new Date(y, 0, 1), end: new Date(y, 5, 30) }
            : { start: new Date(y, 6, 1), end: new Date(y, 11, 31) };
        case "연 1회":
        default:
          return { start: new Date(y, 0, 1), end: new Date(y, 11, 31) };
      }
    }

    // 주기별 임박 기준일수
    function getImminentDays(cycle: string): number {
      switch (cycle) {
        case "매주": return 2;
        case "매월": return 7;
        default: return 30;
      }
    }

    const rows: {
      facilityId: string; facilityName: string; serialNumber: string;
      pollutant: string; cycle: string; lastDate: string | null;
      nextDate: string | null; remainingDays: number | null;
      status: "초과" | "임박" | "측정완료" | "정상" | "미측정";
    }[] = [];

    facilities.forEach((f) => {
      (f.pollutants || []).forEach((pollutant) => {
        const cycle = f.pollutantCycles?.[pollutant] || f.measurementCycle;
        const pollutantMs = safeMs
          .filter((m) => m.facilityId === f.id && m.pollutant === pollutant)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastMs = pollutantMs[0] ?? null;

        const isMeasuredIn = (start: Date, end: Date) =>
          pollutantMs.some((m) => {
            const d = new Date(m.date);
            d.setHours(0, 0, 0, 0);
            return d >= start && d <= end;
          });

        const { start: currStart, end: currEnd } = getPeriodBoundaries(cycle, today);

        if (!lastMs) {
          // 한 번도 측정 안 함
          const remaining = Math.ceil((currEnd.getTime() - today.getTime()) / 86400000);
          rows.push({ facilityId: f.id, facilityName: f.name, serialNumber: f.serialNumber, pollutant, cycle, lastDate: null, nextDate: currEnd.toISOString().split("T")[0], remainingDays: remaining, status: "미측정" });
          return;
        }

        if (isMeasuredIn(currStart, currEnd)) {
          // 현재 기간 측정 완료 → 다음 기간 마감일 표시
          const dayAfter = new Date(currEnd);
          dayAfter.setDate(dayAfter.getDate() + 1);
          const { end: nextEnd } = getPeriodBoundaries(cycle, dayAfter);
          const remaining = Math.ceil((nextEnd.getTime() - today.getTime()) / 86400000);
          rows.push({ facilityId: f.id, facilityName: f.name, serialNumber: f.serialNumber, pollutant, cycle, lastDate: lastMs.date, nextDate: nextEnd.toISOString().split("T")[0], remainingDays: remaining, status: "측정완료" });
          return;
        }

        // 현재 기간 미측정 — 이전 기간 확인
        const dayBefore = new Date(currStart);
        dayBefore.setDate(dayBefore.getDate() - 1);
        const { start: prevStart, end: prevEnd } = getPeriodBoundaries(cycle, dayBefore);
        const prevMeasured = isMeasuredIn(prevStart, prevEnd);

        if (!prevMeasured) {
          // 이전 기간도 미측정 → 초과 (이전 기간 마감일 기준 잔여일 = 음수)
          const overdue = Math.ceil((prevEnd.getTime() - today.getTime()) / 86400000);
          rows.push({ facilityId: f.id, facilityName: f.name, serialNumber: f.serialNumber, pollutant, cycle, lastDate: lastMs.date, nextDate: prevEnd.toISOString().split("T")[0], remainingDays: overdue, status: "초과" });
        } else {
          // 이전 기간 측정 완료, 현재 기간 미측정 → 임박 or 정상
          const remaining = Math.ceil((currEnd.getTime() - today.getTime()) / 86400000);
          const status: "임박" | "정상" = remaining <= getImminentDays(cycle) ? "임박" : "정상";
          rows.push({ facilityId: f.id, facilityName: f.name, serialNumber: f.serialNumber, pollutant, cycle, lastDate: lastMs.date, nextDate: currEnd.toISOString().split("T")[0], remainingDays: remaining, status });
        }
      });
    });
    return rows;
  }, [facilities, safeMs]);

  const filteredCycleRows = useMemo(() => {
    if (cycleStatusFilter === "전체") return cycleRows;
    return cycleRows.filter((r) => r.status === cycleStatusFilter);
  }, [cycleRows, cycleStatusFilter]);

  const cycleSummary = useMemo(() => ({
    초과: cycleRows.filter((r) => r.status === "초과").length,
    임박: cycleRows.filter((r) => r.status === "임박").length,
    측정완료: cycleRows.filter((r) => r.status === "측정완료").length,
    정상: cycleRows.filter((r) => r.status === "정상").length,
    미측정: cycleRows.filter((r) => r.status === "미측정").length,
  }), [cycleRows]);

  return (
    <div className="space-y-6">
      {/* 시설별 측정 추이 대시보드 */}
      <FacilitySelector
        facilities={facilities}
        selectedId={selectedId}
        onSelect={(id) => {
          onSelectFacility(id);
          setChartPollutantFilter("All");
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 차트 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {activeParent?.name} 측정 추이
            </CardTitle>
            <div className="flex flex-wrap gap-1 mt-2">
              <Button
                size="sm"
                variant={chartPollutantFilter === "All" ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setChartPollutantFilter("All")}
              >
                전체
              </Button>
              {activePollutants.map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={chartPollutantFilter === p ? "default" : "outline"}
                  className="h-7 text-xs"
                  style={
                    chartPollutantFilter === p
                      ? {
                          backgroundColor:
                            POLLUTANT_COLORS[p] || POLLUTANT_COLORS.Default,
                          borderColor:
                            POLLUTANT_COLORS[p] || POLLUTANT_COLORS.Default,
                        }
                      : {}
                  }
                  onClick={() => setChartPollutantFilter(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                    />
                    <YAxis
                      domain={[0, yAxisMax]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      wrapperStyle={{
                        paddingBottom: "16px",
                        fontSize: "11px",
                      }}
                    />
                    {chartPollutantFilter !== "All" &&
                      activeParent?.pollutantLimits?.[chartPollutantFilter] && (
                        <ReferenceLine
                          y={parseFloat(
                            activeParent.pollutantLimits[chartPollutantFilter]
                          )}
                          stroke="#ef4444"
                          strokeDasharray="6 3"
                          strokeWidth={2}
                          label={{
                            value: `법적 허용기준: ${activeParent.pollutantLimits[chartPollutantFilter]}`,
                            position: "insideTopRight",
                            fill: "#ef4444",
                            fontSize: 11,
                            fontWeight: "bold",
                          }}
                        />
                      )}
                    {activePollutants
                      .filter(
                        (p) =>
                          chartPollutantFilter === "All" ||
                          chartPollutantFilter === p
                      )
                      .map((pollutant) => (
                        <Line
                          key={pollutant}
                          type="monotone"
                          dataKey={pollutant}
                          stroke={
                            POLLUTANT_COLORS[pollutant] ||
                            POLLUTANT_COLORS.Default
                          }
                          strokeWidth={3}
                          dot={{
                            r: 4,
                            strokeWidth: 2,
                            fill: "#fff",
                            stroke:
                              POLLUTANT_COLORS[pollutant] ||
                              POLLUTANT_COLORS.Default,
                          }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                          name={pollutant}
                        >
                          <LabelList
                            dataKey={pollutant}
                            position="top"
                            offset={10}
                            style={{
                              fill:
                                POLLUTANT_COLORS[pollutant] ||
                                POLLUTANT_COLORS.Default,
                              fontSize: 10,
                              fontWeight: "bold",
                            }}
                          />
                        </Line>
                      ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                  데이터가 없습니다
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 최근 측정 이력 */}
        <Card className="bg-slate-900 text-white border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-400 flex items-center gap-2">
              <History className="h-4 w-4" />
              최근 측정 이력
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[370px] overflow-y-auto space-y-2">
            {recentMeasurements.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
                측정 이력이 없습니다
              </div>
            ) : (
              recentMeasurements.map((m) => (
                <div
                  key={m.id}
                  className="p-3 bg-white/5 rounded-lg border border-white/10 flex justify-between items-center"
                >
                  <div>
                    <p className="text-[10px] text-slate-400">{m.date}</p>
                    <p className="text-xs font-semibold">{m.pollutant}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-400">
                      {m.value}{" "}
                      <span className="text-[10px] text-slate-400">
                        {m.unit}
                      </span>
                    </p>
                    <span
                      className={cn(
                        "text-[10px] font-semibold",
                        m.status === "Pass"
                          ? "text-emerald-400"
                          : "text-rose-400"
                      )}
                    >
                      {m.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* 측정 주기 관리 테이블 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              측정 주기 관리
              <button
                className="ml-1 text-muted-foreground hover:text-foreground"
                onClick={() => setCycleTableOpen((v) => !v)}
              >
                {cycleTableOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {/* 요약 배지 */}
              <span
                className="cursor-pointer text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-semibold"
                onClick={() => setCycleStatusFilter(cycleStatusFilter === "초과" ? "전체" : "초과")}
              >
                초과 {cycleSummary.초과}
              </span>
              <span
                className="cursor-pointer text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold"
                onClick={() => setCycleStatusFilter(cycleStatusFilter === "임박" ? "전체" : "임박")}
              >
                임박 {cycleSummary.임박}
              </span>
              <span
                className="cursor-pointer text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold"
                onClick={() => setCycleStatusFilter(cycleStatusFilter === "측정완료" ? "전체" : "측정완료")}
              >
                측정완료 {cycleSummary.측정완료}
              </span>
              <span
                className="cursor-pointer text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold"
                onClick={() => setCycleStatusFilter(cycleStatusFilter === "정상" ? "전체" : "정상")}
              >
                대기중 {cycleSummary.정상}
              </span>
              <span
                className="cursor-pointer text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-semibold"
                onClick={() => setCycleStatusFilter(cycleStatusFilter === "미측정" ? "전체" : "미측정")}
              >
                미측정 {cycleSummary.미측정}
              </span>
              <Select value={cycleStatusFilter} onValueChange={(v) => setCycleStatusFilter(v ?? "전체")}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="전체">전체</SelectItem>
                  <SelectItem value="초과">초과</SelectItem>
                  <SelectItem value="임박">임박</SelectItem>
                  <SelectItem value="측정완료">측정완료</SelectItem>
                  <SelectItem value="정상">대기중</SelectItem>
                  <SelectItem value="미측정">미측정</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        {cycleTableOpen && (
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs">시설명</TableHead>
                    <TableHead className="text-xs">S/N</TableHead>
                    <TableHead className="text-xs">오염물질</TableHead>
                    <TableHead className="text-xs">측정주기</TableHead>
                    <TableHead className="text-xs">최근측정일</TableHead>
                    <TableHead className="text-xs">다음예정일</TableHead>
                    <TableHead className="text-xs text-center">잔여일</TableHead>
                    <TableHead className="text-xs text-center">상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCycleRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-20 text-center text-muted-foreground text-sm">
                        데이터가 없습니다
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCycleRows.map((row, idx) => (
                      <TableRow
                        key={`${row.facilityId}-${row.pollutant}-${idx}`}
                        className={cn(
                          row.status === "초과" && "bg-red-50",
                          row.status === "임박" && "bg-orange-50"
                        )}
                      >
                        <TableCell className="text-xs font-medium">{row.facilityName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.serialNumber}</TableCell>
                        <TableCell className="text-xs">{row.pollutant}</TableCell>
                        <TableCell className="text-xs">{row.cycle}</TableCell>
                        <TableCell className="text-xs">
                          {row.lastDate ?? <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.nextDate ?? <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          {row.remainingDays === null ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <span
                              className={cn(
                                "font-semibold",
                                row.remainingDays < 0 && "text-red-600",
                                row.remainingDays >= 0 && row.remainingDays <= 30 && "text-orange-600",
                                row.remainingDays > 30 && "text-green-600"
                              )}
                            >
                              {row.remainingDays > 0 ? `D-${row.remainingDays}` : row.remainingDays === 0 ? "D-Day" : `D+${Math.abs(row.remainingDays)}`}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={cn(
                              "text-[10px] px-1.5 py-0.5",
                              row.status === "초과" && "bg-red-100 text-red-700 hover:bg-red-100",
                              row.status === "임박" && "bg-orange-100 text-orange-700 hover:bg-orange-100",
                              row.status === "측정완료" && "bg-blue-100 text-blue-700 hover:bg-blue-100",
                              row.status === "정상" && "bg-slate-100 text-slate-600 hover:bg-slate-100",
                              row.status === "미측정" && "bg-gray-100 text-gray-600 hover:bg-gray-100"
                            )}
                          >
                            {row.status === "정상" ? "대기중" : row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
