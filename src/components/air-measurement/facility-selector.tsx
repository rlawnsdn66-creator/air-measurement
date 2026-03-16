"use client";

import { CheckCircle2, Wind } from "lucide-react";
import type { AirFacility } from "@/lib/air-measurement-data";
import { cn } from "@/lib/utils";

interface FacilitySelectorProps {
  facilities: AirFacility[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function FacilitySelector({
  facilities,
  selectedId,
  onSelect,
}: FacilitySelectorProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {facilities.map((eq) => (
        <button
          key={eq.id}
          type="button"
          onClick={() => onSelect(eq.id)}
          className={cn(
            "min-w-[220px] p-4 rounded-lg border-2 transition-all text-left flex flex-col gap-1",
            selectedId === eq.id
              ? "border-primary bg-primary/5"
              : "border-border bg-card hover:border-muted-foreground/30"
          )}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-medium text-muted-foreground">
              S/N: {eq.serialNumber || eq.id}
            </span>
            {selectedId === eq.id && (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            )}
          </div>
          <h4 className="font-semibold text-sm truncate">{eq.name}</h4>
          <p className="text-[10px] text-muted-foreground">
            {eq.type} | {eq.location}
          </p>
        </button>
      ))}
    </div>
  );
}
