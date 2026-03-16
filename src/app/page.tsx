"use client";

import { useState, useCallback } from "react";
import { Leaf, LayoutGrid, ListChecks, Wrench } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusTab } from "@/components/air-measurement/status-tab";
import { MeasureTab } from "@/components/air-measurement/measure-tab";
import { EquipmentTab } from "@/components/air-measurement/equipment-tab";
import type {
  AirFacility,
  AirSelfMeasurement,
} from "@/lib/air-measurement-data";
import {
  STORAGE_KEYS,
  INITIAL_FACILITIES,
} from "@/lib/air-measurement-data";

export default function AirMeasurementPage() {
  const [facilities, setFacilities] = useLocalStorage<AirFacility[]>(
    STORAGE_KEYS.EQUIPMENTS,
    INITIAL_FACILITIES
  );
  const [measurements, setMeasurements] = useLocalStorage<AirSelfMeasurement[]>(
    STORAGE_KEYS.MEASUREMENTS,
    []
  );
  const [activeTab, setActiveTab] = useLocalStorage<string>(
    STORAGE_KEYS.ACTIVE_SUB_TAB,
    "status"
  );
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(
    () => INITIAL_FACILITIES[0]?.id || ""
  );

  const handleUpdateMeasurement = useCallback(
    (updated: AirSelfMeasurement) => {
      setMeasurements((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    },
    [setMeasurements]
  );

  const handleDeleteMeasurements = useCallback(
    (ids: string[]) => {
      setMeasurements((prev) => prev.filter((m) => !ids.includes(m.id)));
    },
    [setMeasurements]
  );

  const handleAddMeasurements = useCallback(
    (newItems: AirSelfMeasurement[]) => {
      setMeasurements((prev) => {
        const filtered = prev.filter(
          (m) =>
            !newItems.some(
              (nm) =>
                nm.date === m.date &&
                nm.facilityId === m.facilityId &&
                nm.pollutant === m.pollutant
            )
        );
        return [...newItems, ...filtered];
      });
    },
    [setMeasurements]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Leaf className="h-6 w-6 text-green-600" />
            대기 자가측정 관리
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            방지시설 운영관리 및 컴플라이언스 통합 시스템
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="status" className="flex items-center gap-1.5">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">모니터링 현황</span>
            <span className="sm:hidden">현황</span>
          </TabsTrigger>
          <TabsTrigger value="measure" className="flex items-center gap-1.5">
            <ListChecks className="h-4 w-4" />
            <span className="hidden sm:inline">자가측정 데이터</span>
            <span className="sm:hidden">측정</span>
          </TabsTrigger>
          <TabsTrigger value="equipment" className="flex items-center gap-1.5">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">자가측정 시설 관리</span>
            <span className="sm:hidden">자산</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-6">
          <StatusTab
            facilities={facilities}
            measurements={measurements}
            selectedId={selectedFacilityId}
            onSelectFacility={setSelectedFacilityId}
            onGoToMeasure={(id) => {
              setSelectedFacilityId(id);
              setActiveTab("measure");
            }}
            onGoToEquipment={() => {
              setActiveTab("equipment");
            }}
          />
        </TabsContent>

        <TabsContent value="measure" className="mt-6">
          <MeasureTab
            facilities={facilities}
            measurements={measurements}
            selectedId={selectedFacilityId}
            onSelectFacility={setSelectedFacilityId}
            onAddMeasurements={handleAddMeasurements}
            onUpdateMeasurement={handleUpdateMeasurement}
            onDeleteMeasurements={handleDeleteMeasurements}
          />
        </TabsContent>

        <TabsContent value="equipment" className="mt-6">
          <EquipmentTab
            facilities={facilities}
            onUpdateFacilities={setFacilities}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
