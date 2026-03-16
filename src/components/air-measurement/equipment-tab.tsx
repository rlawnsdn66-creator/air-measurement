"use client";

import { useState } from "react";
import {
  Wrench,
  Edit3,
  Plus,
  Save,
  Settings2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import type { AirFacility } from "@/lib/air-measurement-data";
import {
  POLLUTANT_OPTIONS,
  MEASUREMENT_CYCLES,
  FACILITY_TYPES,
} from "@/lib/air-measurement-data";

interface EquipmentTabProps {
  facilities: AirFacility[];
  onUpdateFacilities: (facilities: AirFacility[]) => void;
}

export function EquipmentTab({ facilities, onUpdateFacilities }: EquipmentTabProps) {
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Partial<AirFacility> | null>(null);
  const [isNew, setIsNew] = useState(false);

  const handleOpenCard = (asset: AirFacility) => {
    setEditingAsset({ ...asset });
    setIsNew(false);
    setIsAssetModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingAsset({
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
    });
    setIsNew(true);
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
    setIsAssetModalOpen(false);
    toast.success("저장되었습니다");
  };

  const togglePollutant = (p: string) => {
    if (!editingAsset) return;
    const current = editingAsset.pollutants || [];
    const next = current.includes(p)
      ? current.filter((item) => item !== p)
      : [...current, p];
    setEditingAsset({ ...editingAsset, pollutants: next });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {facilities.map((eq) => (
          <Card
            key={eq.id}
            className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
            onClick={() => handleOpenCard(eq)}
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary/10 text-primary rounded-lg">
                  <Wrench className="h-6 w-6" />
                </div>
                <div className="text-right space-y-1">
                  <Badge
                    variant={eq.status === "정상" ? "default" : "destructive"}
                    className={eq.status === "정상" ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}
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
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <div className="flex flex-wrap gap-1">
                  {(eq.pollutants || []).slice(0, 3).map((p) => (
                    <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0">
                      {p}
                    </Badge>
                  ))}
                  {(eq.pollutants || []).length > 3 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      +{(eq.pollutants || []).length - 3}
                    </Badge>
                  )}
                </div>
                <Edit3 className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
        <Card
          className="cursor-pointer border-2 border-dashed hover:border-primary/50 transition-all flex items-center justify-center min-h-[200px]"
          onClick={handleOpenNew}
        >
          <CardContent className="flex flex-col items-center text-muted-foreground py-8">
            <Plus className="h-10 w-10 mb-2" />
            <span className="text-sm font-medium">새 설비 등록</span>
          </CardContent>
        </Card>
      </div>

      {isAssetModalOpen && editingAsset && (
        <AssetModal
          editingAsset={editingAsset}
          setEditingAsset={setEditingAsset}
          onSave={handleSaveAsset}
          onClose={() => setIsAssetModalOpen(false)}
          togglePollutant={togglePollutant}
          startInEditMode={isNew}
        />
      )}
    </div>
  );
}

function AssetModal({
  editingAsset,
  setEditingAsset,
  onSave,
  onClose,
  togglePollutant,
  startInEditMode,
}: {
  editingAsset: Partial<AirFacility>;
  setEditingAsset: (asset: Partial<AirFacility> | null) => void;
  onSave: () => void;
  onClose: () => void;
  togglePollutant: (p: string) => void;
  startInEditMode: boolean;
}) {
  const [isEditing, setIsEditing] = useState(startInEditMode);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              {editingAsset.name || "새 설비"} 시설 정보
            </DialogTitle>
            <div className="flex items-center gap-2 pr-6">
              {!isEditing ? (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-4 w-4 mr-1" />
                  수정
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); }}>
                    <X className="h-4 w-4 mr-1" />
                    취소
                  </Button>
                  <Button size="sm" onClick={onSave}>
                    <Save className="h-4 w-4 mr-1" />
                    저장
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground border-b pb-2">기본 정보</h4>
            <div className="space-y-2">
              <Label>방지시설 S/N (파일 매칭용)</Label>
              <Input
                value={editingAsset.serialNumber || ""}
                onChange={(e) => setEditingAsset({ ...editingAsset, serialNumber: e.target.value })}
                placeholder="예: 7, 9 등"
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label>설비 명칭</Label>
              <Input
                value={editingAsset.name || ""}
                onChange={(e) => setEditingAsset({ ...editingAsset, name: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>종류</Label>
                <Select
                  value={editingAsset.type || "집진시설"}
                  onValueChange={(v) => v && setEditingAsset({ ...editingAsset, type: v })}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FACILITY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>모델</Label>
              <Input
                value={editingAsset.model || ""}
                onChange={(e) => setEditingAsset({ ...editingAsset, model: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label>위치</Label>
              <Input
                value={editingAsset.location || ""}
                onChange={(e) => setEditingAsset({ ...editingAsset, location: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label>허가증상 배출구번호</Label>
              <Input
                value={editingAsset.permitNumber || ""}
                onChange={(e) => setEditingAsset({ ...editingAsset, permitNumber: e.target.value })}
                disabled={!isEditing}
              />
            </div>
          </div>

          {/* 오염물질 및 기준 */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground border-b pb-2">오염물질 및 기준 관리</h4>
            <div className="flex flex-wrap gap-2">
              {POLLUTANT_OPTIONS.map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={editingAsset.pollutants?.includes(p) ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => isEditing && togglePollutant(p)}
                  disabled={!isEditing}
                >
                  {p}
                </Button>
              ))}
            </div>
            <div className="space-y-3 bg-muted/30 p-4 rounded-lg max-h-[300px] overflow-y-auto">
              {editingAsset.pollutants?.map((p) => (
                <div key={p} className="p-3 bg-card rounded-lg border space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-sm font-medium">{p}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">허용 기준 (Limit)</Label>
                        {isEditing && (
                          <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer select-none">
                            <Checkbox
                              checked={editingAsset.pollutantLimits?.[p] === "N/A"}
                              onCheckedChange={(checked) =>
                                setEditingAsset({
                                  ...editingAsset,
                                  pollutantLimits: {
                                    ...(editingAsset.pollutantLimits || {}),
                                    [p]: checked ? "N/A" : "",
                                  },
                                })
                              }
                              className="h-3.5 w-3.5"
                            />
                            기준 없음
                          </label>
                        )}
                      </div>
                      <Input
                        type="number"
                        value={editingAsset.pollutantLimits?.[p] === "N/A" ? "" : (editingAsset.pollutantLimits?.[p] || "")}
                        onChange={(e) =>
                          setEditingAsset({
                            ...editingAsset,
                            pollutantLimits: { ...(editingAsset.pollutantLimits || {}), [p]: e.target.value },
                          })
                        }
                        disabled={!isEditing || editingAsset.pollutantLimits?.[p] === "N/A"}
                        className={editingAsset.pollutantLimits?.[p] === "N/A" ? "opacity-50" : ""}
                        placeholder={editingAsset.pollutantLimits?.[p] === "N/A" ? "기준 없음" : "0.0"}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">측정 주기</Label>
                      <Select
                        value={editingAsset.pollutantCycles?.[p] || editingAsset.measurementCycle || "분기 1회"}
                        onValueChange={(v) =>
                          v && setEditingAsset({
                            ...editingAsset,
                            pollutantCycles: { ...(editingAsset.pollutantCycles || {}), [p]: v },
                          })
                        }
                        disabled={!isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MEASUREMENT_CYCLES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
              {(!editingAsset.pollutants || editingAsset.pollutants.length === 0) && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  {isEditing ? "위에서 오염물질을 선택해주세요" : "등록된 오염물질이 없습니다"}
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
