"use client";

import { useState } from "react";
import {
  Wrench,
  ArrowLeft,
  ArrowRight,
  Edit3,
  Plus,
  Save,
  X,
  History,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import type {
  AirFacility,
  MaintenanceLog,
} from "@/lib/air-measurement-data";
import {
  POLLUTANT_OPTIONS,
  MEASUREMENT_CYCLES,
  MAINTENANCE_TYPES,
  FACILITY_TYPES,
} from "@/lib/air-measurement-data";
import { cn } from "@/lib/utils";

interface EquipmentTabProps {
  facilities: AirFacility[];
  onUpdateFacilities: (facilities: AirFacility[]) => void;
}

export function EquipmentTab({
  facilities,
  onUpdateFacilities,
}: EquipmentTabProps) {
  const [selectedDetail, setSelectedDetail] = useState<AirFacility | null>(
    null
  );
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Partial<AirFacility> | null>(
    null
  );
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState<
    Partial<MaintenanceLog>
  >({
    date: new Date().toISOString().split("T")[0],
    type: "정기점검",
    description: "",
    technician: "",
    cost: 0,
  });

  const handleOpenAssetModal = (asset?: AirFacility) => {
    setEditingAsset(
      asset || {
        id: `EQ-ENV-${(facilities.length + 1).toString().padStart(3, "0")}`,
        serialNumber: "",
        name: "",
        type: "집진시설",
        model: "",
        location: "",
        installDate: new Date().toISOString().split("T")[0],
        status: "정상",
        lastMaintenance: new Date().toISOString().split("T")[0],
        nextMaintenance: "",
        pollutants: [],
        pollutantLimits: {},
        pollutantCycles: {},
        measurementCycle: "분기 1회",
        logs: [],
      }
    );
    setIsAssetModalOpen(true);
  };

  const handleSaveAsset = () => {
    if (!editingAsset?.name) {
      toast.error("설비 명칭을 입력해주세요");
      return;
    }
    const updated = editingAsset as AirFacility;
    const exists = facilities.find((e) => e.id === updated.id);
    const newFacilities = exists
      ? facilities.map((e) => (e.id === updated.id ? updated : e))
      : [...facilities, updated];
    onUpdateFacilities(newFacilities);
    if (selectedDetail?.id === updated.id) {
      setSelectedDetail(updated);
    }
    setIsAssetModalOpen(false);
    toast.success("자산 정보가 저장되었습니다");
  };

  const handleSaveMaintenanceRecord = () => {
    if (!selectedDetail || !maintenanceForm.description) {
      toast.error("점검 내용을 입력해주세요");
      return;
    }
    const newLog: MaintenanceLog = {
      id: `LOG-${Date.now()}`,
      date: maintenanceForm.date || new Date().toISOString().split("T")[0],
      type: (maintenanceForm.type as MaintenanceLog["type"]) || "정기점검",
      description: maintenanceForm.description,
      technician: maintenanceForm.technician || "",
      cost: Number(maintenanceForm.cost) || 0,
    };
    const updatedAsset: AirFacility = {
      ...selectedDetail,
      logs: [newLog, ...selectedDetail.logs],
      lastMaintenance: newLog.date,
    };
    onUpdateFacilities(
      facilities.map((e) => (e.id === updatedAsset.id ? updatedAsset : e))
    );
    setSelectedDetail(updatedAsset);
    setIsMaintenanceModalOpen(false);
    setMaintenanceForm({
      date: new Date().toISOString().split("T")[0],
      type: "정기점검",
      description: "",
      technician: "",
      cost: 0,
    });
    toast.success("점검 이력이 저장되었습니다");
  };

  const togglePollutant = (p: string) => {
    if (!editingAsset) return;
    const current = editingAsset.pollutants || [];
    const next = current.includes(p)
      ? current.filter((item) => item !== p)
      : [...current, p];
    setEditingAsset({ ...editingAsset, pollutants: next });
  };

  // 상세 보기
  if (selectedDetail) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedDetail(null)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          전체 목록
        </Button>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌측: 자산 정보 */}
          <div className="space-y-4">
            <Card>
              <div className="bg-slate-900 text-white p-6 rounded-t-lg">
                <div className="flex justify-between items-start mb-3">
                  <Badge className="bg-primary text-primary-foreground">
                    {selectedDetail.id}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-slate-400 hover:text-white"
                    onClick={() => handleOpenAssetModal(selectedDetail)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
                <h2 className="text-xl font-bold mb-1">
                  {selectedDetail.name}
                </h2>
                <p className="text-xs text-slate-400">
                  S/N: {selectedDetail.serialNumber || "미지정"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedDetail.model} | {selectedDetail.location}
                </p>
              </div>
              <CardContent className="p-6 space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground">
                  법적기준 및 측정주기
                </h4>
                <div className="space-y-2">
                  {selectedDetail.pollutants?.map((p) => (
                    <div
                      key={p}
                      className="p-3 bg-muted/50 rounded-lg space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{p}</span>
                        <span className="text-sm font-semibold text-primary">
                          {selectedDetail.pollutantLimits?.[p] || "-"}
                          <span className="text-xs text-muted-foreground ml-1">
                            Limit
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-[10px] text-muted-foreground">
                          측정 주기
                        </span>
                        <span className="text-xs font-medium">
                          {selectedDetail.pollutantCycles?.[p] ||
                            selectedDetail.measurementCycle}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 우측: 점검 이력 */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    점검 이력 카드
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => setIsMaintenanceModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    점검 이력 추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedDetail.logs.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDetail.logs.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 bg-muted/50 rounded-lg flex justify-between items-center border hover:border-primary/30 transition-colors"
                      >
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">
                            {log.date} | {log.type}
                          </p>
                          <h4 className="font-semibold">{log.description}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            담당: {log.technician}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">
                            ₩{log.cost.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 text-muted-foreground border-2 border-dashed rounded-lg text-sm">
                    등록된 점검 이력이 없습니다.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 점검 이력 추가 모달 */}
        <Dialog
          open={isMaintenanceModalOpen}
          onOpenChange={setIsMaintenanceModalOpen}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                점검 이력 추가
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>점검 일자</Label>
                  <Input
                    type="date"
                    value={maintenanceForm.date}
                    onChange={(e) =>
                      setMaintenanceForm({
                        ...maintenanceForm,
                        date: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>점검 유형</Label>
                  <Select
                    value={maintenanceForm.type}
                    onValueChange={(v) =>
                      v && setMaintenanceForm({ ...maintenanceForm, type: v as MaintenanceLog["type"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MAINTENANCE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>점검 내용 상세</Label>
                <Textarea
                  rows={3}
                  value={maintenanceForm.description}
                  onChange={(e) =>
                    setMaintenanceForm({
                      ...maintenanceForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="점검 및 수리 내용을 기술하세요."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>담당 기술자</Label>
                  <Input
                    value={maintenanceForm.technician}
                    onChange={(e) =>
                      setMaintenanceForm({
                        ...maintenanceForm,
                        technician: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>소요 비용 (₩)</Label>
                  <Input
                    type="number"
                    value={maintenanceForm.cost}
                    onChange={(e) =>
                      setMaintenanceForm({
                        ...maintenanceForm,
                        cost: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsMaintenanceModalOpen(false)}
                >
                  취소
                </Button>
                <Button onClick={handleSaveMaintenanceRecord}>
                  <Save className="h-4 w-4 mr-1" />
                  저장
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 자산 수정 모달 (공유) */}
        {isAssetModalOpen && editingAsset && (
          <AssetModal
            editingAsset={editingAsset}
            setEditingAsset={setEditingAsset}
            onSave={handleSaveAsset}
            onClose={() => setIsAssetModalOpen(false)}
            togglePollutant={togglePollutant}
          />
        )}
      </div>
    );
  }

  // 목록 보기
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {facilities.map((eq) => (
          <Card
            key={eq.id}
            className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
            onClick={() => setSelectedDetail(eq)}
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary/10 text-primary rounded-lg">
                  <Wrench className="h-6 w-6" />
                </div>
                <div className="text-right space-y-1">
                  <Badge
                    variant={eq.status === "정상" ? "default" : "destructive"}
                    className={
                      eq.status === "정상"
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : ""
                    }
                  >
                    {eq.status}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground">
                    S/N: {eq.serialNumber || "미지정"}
                  </p>
                </div>
              </div>
              <h3 className="text-lg font-bold">{eq.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {eq.location} | {eq.model}
              </p>
              <div className="mt-4 pt-4 border-t flex justify-between items-end">
                <div>
                  <span className="text-[10px] text-muted-foreground block">
                    최종 점검일
                  </span>
                  <span className="text-sm font-medium">
                    {eq.lastMaintenance}
                  </span>
                </div>
                <span className="text-xs text-primary font-medium flex items-center">
                  상세 보기
                  <ArrowRight className="h-3 w-3 ml-1" />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
        <Card
          className="cursor-pointer border-2 border-dashed hover:border-primary/50 transition-all flex items-center justify-center min-h-[200px]"
          onClick={() => handleOpenAssetModal()}
        >
          <CardContent className="flex flex-col items-center text-muted-foreground py-8">
            <Plus className="h-10 w-10 mb-2" />
            <span className="text-sm font-medium">새 설비 등록</span>
          </CardContent>
        </Card>
      </div>

      {/* 자산 등록/수정 모달 */}
      {isAssetModalOpen && editingAsset && (
        <AssetModal
          editingAsset={editingAsset}
          setEditingAsset={setEditingAsset}
          onSave={handleSaveAsset}
          onClose={() => setIsAssetModalOpen(false)}
          togglePollutant={togglePollutant}
        />
      )}
    </div>
  );
}

// 자산 등록/수정 모달 (공유 컴포넌트)
function AssetModal({
  editingAsset,
  setEditingAsset,
  onSave,
  onClose,
  togglePollutant,
}: {
  editingAsset: Partial<AirFacility>;
  setEditingAsset: (asset: Partial<AirFacility> | null) => void;
  onSave: () => void;
  onClose: () => void;
  togglePollutant: (p: string) => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            자산 설정
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground border-b pb-2">
              기본 정보
            </h4>
            <div className="space-y-2">
              <Label>방지시설 S/N (파일 매칭용)</Label>
              <Input
                value={editingAsset.serialNumber || ""}
                onChange={(e) =>
                  setEditingAsset({
                    ...editingAsset,
                    serialNumber: e.target.value,
                  })
                }
                placeholder="예: 7, 9 등"
              />
            </div>
            <div className="space-y-2">
              <Label>설비 명칭</Label>
              <Input
                value={editingAsset.name || ""}
                onChange={(e) =>
                  setEditingAsset({ ...editingAsset, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>종류</Label>
                <Select
                  value={editingAsset.type || "집진시설"}
                  onValueChange={(v) =>
                    v && setEditingAsset({ ...editingAsset, type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FACILITY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>기본 측정 주기</Label>
                <Select
                  value={editingAsset.measurementCycle || "분기 1회"}
                  onValueChange={(v) =>
                    v && setEditingAsset({
                      ...editingAsset,
                      measurementCycle: v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEASUREMENT_CYCLES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>모델</Label>
              <Input
                value={editingAsset.model || ""}
                onChange={(e) =>
                  setEditingAsset({ ...editingAsset, model: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>위치</Label>
              <Input
                value={editingAsset.location || ""}
                onChange={(e) =>
                  setEditingAsset({
                    ...editingAsset,
                    location: e.target.value,
                  })
                }
              />
            </div>
          </div>

          {/* 오염물질 및 기준 */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground border-b pb-2">
              오염물질 및 기준 관리
            </h4>
            <div className="flex flex-wrap gap-2">
              {POLLUTANT_OPTIONS.map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={
                    editingAsset.pollutants?.includes(p)
                      ? "default"
                      : "outline"
                  }
                  className="h-7 text-xs"
                  onClick={() => togglePollutant(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
            <div className="space-y-3 bg-muted/30 p-4 rounded-lg max-h-[300px] overflow-y-auto">
              {editingAsset.pollutants?.map((p) => (
                <div
                  key={p}
                  className="p-3 bg-card rounded-lg border space-y-3"
                >
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-sm font-medium">{p}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">허용 기준 (Limit)</Label>
                      <Input
                        type="number"
                        value={editingAsset.pollutantLimits?.[p] || ""}
                        onChange={(e) =>
                          setEditingAsset({
                            ...editingAsset,
                            pollutantLimits: {
                              ...(editingAsset.pollutantLimits || {}),
                              [p]: e.target.value,
                            },
                          })
                        }
                        placeholder="0.0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">측정 주기</Label>
                      <Select
                        value={
                          editingAsset.pollutantCycles?.[p] ||
                          editingAsset.measurementCycle ||
                          "분기 1회"
                        }
                        onValueChange={(v) =>
                          v && setEditingAsset({
                            ...editingAsset,
                            pollutantCycles: {
                              ...(editingAsset.pollutantCycles || {}),
                              [p]: v,
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MEASUREMENT_CYCLES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
              {(!editingAsset.pollutants ||
                editingAsset.pollutants.length === 0) && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  위에서 오염물질을 선택해주세요
                </p>
              )}
            </div>
            <Button onClick={onSave} className="w-full">
              <Save className="h-4 w-4 mr-1" />
              자산 정보 저장
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
