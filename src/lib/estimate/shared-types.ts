import type { EstimateOutput } from './types';

export type SharedEstimateStatus = 'draft' | 'public' | 'revoked';

/** Preview imagery URLs for PDF + shared page (built server-side; tokens in URL only at request time). */
export interface SharedPreviewAssets {
  satelliteStaticUrl?: string;
  streetViewStaticUrl?: string;
  siteCoordinates?: [number, number];
}

export interface SharedEstimateRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: SharedEstimateStatus;
  output: EstimateOutput;
  previewAssets?: SharedPreviewAssets;
}
