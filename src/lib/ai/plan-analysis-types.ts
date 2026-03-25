export interface PlanAnalysisResponse {
  runs: Array<{
    runType: string;
    /** Normalized [0–1] x,y per vertex on the plan image */
    points: [number, number][];
  }>;
  equipment: Array<{
    equipmentType: string;
    relativeX: number;
    relativeY: number;
    label: string;
  }>;
  notes: string;
  confidence: string;
  needsReview: boolean;
}
