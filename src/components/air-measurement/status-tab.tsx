"use client";

import { useState, useMemo } from "react";
import { Activity, History } from "lucide-react";
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
    </div>
  );
}
