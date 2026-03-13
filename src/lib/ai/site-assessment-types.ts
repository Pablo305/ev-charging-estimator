// ============================================================
// Site Assessment Types — AI-Powered Assessment Engine
// ============================================================

export interface SatelliteAnalysisResult {
  readonly siteDescription: string;
  readonly inferredFields: Record<string, unknown>;
  readonly estimatedParkingSpaces: number | null;
  readonly suggestedChargerCount: {
    readonly min: number | null;
    readonly max: number | null;
    readonly reasoning: string;
  } | null;
  readonly parkingLayoutGeometry: {
    readonly stallOrientation: 'angled' | 'perpendicular' | 'parallel' | 'mixed' | null;
    readonly driveAisleWidthEstimate: 'narrow' | 'standard' | 'wide' | null;
    readonly adaZonesVisible: boolean;
    readonly surfaceTransitions: string[];
  } | null;
  readonly electricalInfrastructure: {
    readonly transformerPadVisible: boolean;
    readonly meterClusterVisible: boolean;
    readonly utilityPoleNearby: boolean;
    readonly estimatedPanelSide: string | null;
  } | null;
  readonly concerns: readonly string[];
  readonly confidence: number;
}

export interface StreetViewAnalysisResult {
  readonly siteDescription: string;
  readonly inferredFields: Record<string, unknown>;
  readonly observations: Readonly<Record<string, string>>;
  readonly electricalObservation: ElectricalObservation | null;
  readonly mountRecommendation: {
    readonly type: string | null;
    readonly reason: string;
    readonly suggestedLocations: string;
  } | null;
  readonly conduitRouting: {
    readonly existingConduitVisible: boolean;
    readonly wallMountFeasibility: 'good' | 'fair' | 'poor' | null;
    readonly wallMaterial: string | null;
    readonly routingOpportunities: string[];
  } | null;
  readonly adaCompliance: {
    readonly adaParkingVisible: boolean;
    readonly pathOfTravelClear: boolean;
    readonly concerns: string[];
  } | null;
  readonly concerns: readonly string[];
  readonly confidence: number;
}

export interface ElectricalObservation {
  readonly panelVisible: boolean;
  readonly transformerVisible: boolean;
  readonly meterClusterVisible: boolean;
  readonly existingConduitVisible: boolean;
  readonly estimatedPanelLocation: string;
  readonly description: string;
}

export interface MergedInference {
  readonly fieldPath: string;
  readonly value: unknown;
  readonly source: 'satellite' | 'streetview' | 'both';
  readonly confidence: number;
  readonly reasoning: string;
}

export interface SmartQuestion {
  readonly id: string;
  readonly fieldPath: string;
  readonly question: string;
  readonly type: 'confirm' | 'select' | 'number' | 'text';
  readonly aiSuggestion: unknown;
  readonly options?: readonly { readonly label: string; readonly value: unknown }[];
  readonly priority: 'blocking' | 'important' | 'nice_to_have';
}

export interface SiteIntelligence {
  readonly satelliteAnalysis: SatelliteAnalysisResult | null;
  readonly streetViewAnalysis: StreetViewAnalysisResult | null;
  readonly mergedInferences: readonly MergedInference[];
  readonly unansweredQuestions: readonly SmartQuestion[];
  readonly overallConfidence: number;
}

export type AssessmentPhase =
  | 'idle'
  | 'geocoding'
  | 'analyzing_satellite'
  | 'analyzing_streetview'
  | 'merging'
  | 'awaiting_user_input'
  | 'generating_runs'
  | 'complete';
