/**
 * Hand-written minimal Supabase types for the EV estimator schema.
 *
 * Structure follows the shape expected by @supabase/supabase-js generics:
 *   Database[schema]['Tables'][table] => { Row, Insert, Update }
 *
 * When `supabase gen types` becomes available in this repo we can replace
 * this file wholesale. Until then, we keep it minimal but correct so
 * repository code can type-check.
 *
 * Forward-only: add fields here whenever a new SQL migration adds a column.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'admin' | 'sales_rep' | 'viewer';

export type ProjectStatus = 'draft' | 'active' | 'completed';

export type EstimateStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'expired';

export type SitePhotoKind =
  | 'street_view'
  | 'satellite'
  | 'uploaded'
  | 'annotated';

export type RenderingStatus = 'queued' | 'processing' | 'complete' | 'failed';

// -----------------------------------------------------------------------------
// Row types (one per table)
// -----------------------------------------------------------------------------

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface CustomerRow {
  id: string;
  sales_rep_id: string | null;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_zip: string | null;
  notes: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface ProjectRow {
  id: string;
  customer_id: string;
  sales_rep_id: string | null;
  name: string;
  description: string | null;
  status: ProjectStatus;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface EstimateRow {
  id: string;
  project_id: string;
  parent_estimate_id: string | null;
  version_number: number;
  status: EstimateStatus;
  schema_version: string;
  input_json: Json;
  output_json: Json;
  total_cost: number | null;
  sales_rep_id: string | null;
  customer_view_token: string;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  expires_at: string | null;
  notes: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface LineItemRow {
  id: string;
  estimate_id: string;
  category: string;
  sku: string | null;
  description: string;
  quantity: number;
  unit: string | null;
  unit_cost: number;
  extended_cost: number;
  source_formula: string | null;
  job_type: string | null;
  position: number;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface SitePhotoRow {
  id: string;
  project_id: string;
  uploaded_by: string | null;
  kind: SitePhotoKind;
  heading: number | null;
  pitch: number | null;
  fov: number | null;
  location_label: string | null;
  latitude: number | null;
  longitude: number | null;
  storage_path: string;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface RenderingRow {
  id: string;
  project_id: string;
  source_photo_id: string | null;
  requested_by: string | null;
  model_used: string | null;
  prompt: string | null;
  status: RenderingStatus;
  storage_path: string | null;
  error: string | null;
  cost_usd: number | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface AcceptanceRow {
  id: string;
  estimate_id: string;
  signer_name: string;
  signer_email: string | null;
  signer_ip: string | null;
  signer_user_agent: string | null;
  signature_svg: string | null;
  pdf_storage_path: string | null;
  accepted_at: string;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface PricingCatalogRow {
  product_id: string;
  description: string;
  unit: string | null;
  unit_cost: number;
  category: string;
  markup: number;
  active: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

// Pre-existing JSON-blob sharing table (from 001_shared_estimates.sql).
export interface SharedEstimateRow {
  id: string;
  payload: Json;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Helper to build Insert/Update types with sensible defaults.
// DB default columns become optional on Insert; all columns optional on Update.
// -----------------------------------------------------------------------------

type WithDefaults<TRow, TDefaulted extends keyof TRow> = Omit<
  TRow,
  TDefaulted
> &
  Partial<Pick<TRow, TDefaulted>>;

type CommonDefaulted = 'id' | 'created_at' | 'updated_at' | 'metadata';

type InsertOf<TRow, TExtra extends keyof TRow = never> = WithDefaults<
  TRow,
  Extract<CommonDefaulted | TExtra, keyof TRow>
>;

type UpdateOf<TRow> = Partial<TRow>;

// -----------------------------------------------------------------------------
// Database shape (mirrors Supabase SDK expectations)
// -----------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: InsertOf<ProfileRow, 'role' | 'is_active' | 'full_name'>;
        Update: UpdateOf<ProfileRow>;
      };
      customers: {
        Row: CustomerRow;
        Insert: InsertOf<
          CustomerRow,
          | 'sales_rep_id'
          | 'contact_name'
          | 'contact_email'
          | 'contact_phone'
          | 'billing_address'
          | 'billing_city'
          | 'billing_state'
          | 'billing_zip'
          | 'notes'
        >;
        Update: UpdateOf<CustomerRow>;
      };
      projects: {
        Row: ProjectRow;
        Insert: InsertOf<
          ProjectRow,
          | 'sales_rep_id'
          | 'description'
          | 'status'
          | 'address'
          | 'city'
          | 'state'
          | 'zip'
          | 'latitude'
          | 'longitude'
        >;
        Update: UpdateOf<ProjectRow>;
      };
      estimates: {
        Row: EstimateRow;
        Insert: InsertOf<
          EstimateRow,
          | 'parent_estimate_id'
          | 'version_number'
          | 'status'
          | 'schema_version'
          | 'input_json'
          | 'output_json'
          | 'total_cost'
          | 'sales_rep_id'
          | 'customer_view_token'
          | 'sent_at'
          | 'accepted_at'
          | 'rejected_at'
          | 'expires_at'
          | 'notes'
        >;
        Update: UpdateOf<EstimateRow>;
      };
      line_items: {
        Row: LineItemRow;
        Insert: InsertOf<
          LineItemRow,
          | 'sku'
          | 'quantity'
          | 'unit'
          | 'unit_cost'
          | 'extended_cost'
          | 'source_formula'
          | 'job_type'
          | 'position'
        >;
        Update: UpdateOf<LineItemRow>;
      };
      site_photos: {
        Row: SitePhotoRow;
        Insert: InsertOf<
          SitePhotoRow,
          | 'uploaded_by'
          | 'heading'
          | 'pitch'
          | 'fov'
          | 'location_label'
          | 'latitude'
          | 'longitude'
          | 'mime_type'
          | 'width'
          | 'height'
        >;
        Update: UpdateOf<SitePhotoRow>;
      };
      renderings: {
        Row: RenderingRow;
        Insert: InsertOf<
          RenderingRow,
          | 'source_photo_id'
          | 'requested_by'
          | 'model_used'
          | 'prompt'
          | 'status'
          | 'storage_path'
          | 'error'
          | 'cost_usd'
        >;
        Update: UpdateOf<RenderingRow>;
      };
      acceptances: {
        Row: AcceptanceRow;
        Insert: InsertOf<
          AcceptanceRow,
          | 'signer_email'
          | 'signer_ip'
          | 'signer_user_agent'
          | 'signature_svg'
          | 'pdf_storage_path'
          | 'accepted_at'
        >;
        Update: UpdateOf<AcceptanceRow>;
      };
      pricing_catalog: {
        Row: PricingCatalogRow;
        Insert: InsertOf<
          PricingCatalogRow,
          'unit' | 'unit_cost' | 'markup' | 'active'
        > & { product_id: string };
        Update: UpdateOf<PricingCatalogRow>;
      };
      shared_estimates: {
        Row: SharedEstimateRow;
        Insert: InsertOf<SharedEstimateRow> & { id: string };
        Update: UpdateOf<SharedEstimateRow>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      project_status: ProjectStatus;
      estimate_status: EstimateStatus;
    };
  };
}
