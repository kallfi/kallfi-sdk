/* eslint-disable */
// GENERATED FILE. Do not edit by hand; run `npm run generate`.
// OpenAPI snapshot SHA-256: 904b0d63060add46c55e1297255eec29b08e3733eac57d9157d4202f9823a9f2

export interface ErrorResponse {
  error: {
  code: string;
  message: string;
  request_id: string;
  details?: {
  [key: string]: string;
};
};
}

export type SoulId = string;

export type OperationId = string;

export type SourceAssetId = string;

export type ExternalSoulId = string;

export type SoulKind = "human" | "creature";

export type SourceAssetType = "appearance_reference" | "content_style_reference" | "text_video_timeline";

export type Lifecycle = "draft" | "active" | "suspended" | "deleted";

export interface MediaDeclaration {
  content_type: string;
  byte_length: number;
  sha256: string;
}

export interface RightsAttestation {
  basis: "owned_or_licensed";
  subject_consent: boolean;
}

export interface TimelineAnnotation {
  request_at_ms: number;
  behavior_start_ms: number;
  behavior_end_ms: number;
  user_request: string;
}

export interface SourceAssetCreateRequest {
  type: SourceAssetType;
  media: MediaDeclaration;
  annotations?: ReadonlyArray<TimelineAnnotation>;
  rights_attestation: RightsAttestation;
}

export interface UploadTarget {
  method: "PUT";
  url: string;
  expires_at: string;
  headers?: {
  [key: string]: string;
};
}

export type SourceAssetStatus = "upload_pending" | "validating" | "ready" | "rejected" | "expired";

export interface SourceAsset {
  source_asset_id: SourceAssetId;
  type: SourceAssetType;
  status: SourceAssetStatus;
  media: MediaDeclaration;
  annotations?: ReadonlyArray<TimelineAnnotation>;
  rights_attestation: RightsAttestation;
  upload: UploadTarget;
  created_at: string;
}

export interface SoulCreateRequest {
  external_soul_id: ExternalSoulId;
  kind: SoulKind;
  description: string;
  source_asset_ids: ReadonlyArray<SourceAssetId>;
}

export interface SoulUpdateRequest {
  expected_revision: number;
  description?: string;
}

export interface SoulCapabilities {
  responses: boolean;
  image_generation: boolean;
  video_generation: boolean;
}

export interface Soul {
  soul_id: SoulId;
  external_soul_id: ExternalSoulId;
  kind: SoulKind;
  description: string;
  lifecycle: Lifecycle;
  revision: number;
  source_asset_ids: ReadonlyArray<SourceAssetId>;
  capabilities: SoulCapabilities;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ResponseCreateRequest {
  messages: ReadonlyArray<ConversationMessage>;
  max_output_tokens?: number;
}

export interface QuoteReference {
  quote_id: string;
}

export interface GenerationCreateRequest {
  kind: "image" | "video";
  prompt: string;
  quote_id: string;
  duration_ms?: number;
  source_asset_ids?: ReadonlyArray<SourceAssetId>;
}

export interface ResourceReference {
  type: "source_asset" | "soul" | "response" | "generation";
  id: string;
}

export type OperationKind = "source_asset_validation" | "soul_creation" | "soul_update" | "soul_response" | "image_generation" | "video_generation";

export type OperationStatus = "accepted" | "submitted" | "running" | "acceptance_unknown" | "succeeded" | "failed" | "canceled";

export interface OperationFailure {
  code: string;
  message: string;
  retryable: boolean;
}

export interface OperationUsage {
  reserved_gems: number;
  consumed_gems: number;
  released_gems: number;
}

export interface MediaLocator {
  kind: "image" | "video";
  url: string;
  expires_at: string;
}

export interface OperationOutput {
  kind: "text" | "image" | "video";
  text?: string;
  media?: ReadonlyArray<MediaLocator>;
}

export interface OperationLinks {
  self: string;
}

export interface Operation {
  operation_id: OperationId;
  kind: OperationKind;
  status: OperationStatus;
  resource?: ResourceReference;
  progress_percent?: number;
  quote?: QuoteReference;
  usage?: OperationUsage;
  failure?: OperationFailure;
  output?: OperationOutput;
  created_at: string;
  updated_at: string;
  links?: OperationLinks;
}

export interface OperationAcceptedResponse {
  operation: Operation;
}

export interface SourceAssetAcceptedResponse {
  source_asset: SourceAsset;
  operation: Operation;
}

export interface SoulAcceptedResponse {
  soul: Soul;
  operation: Operation;
}

export interface SoulUpdateAcceptedResponse {
  soul: Soul;
  operation: Operation;
}
