/* eslint-disable */
// GENERATED FILE. Do not edit by hand; run `npm run generate`.
// OpenAPI snapshot SHA-256: 742fe946d29ef7e286eead3c8cea50a8a344793b2136f843655f896daea1d99b

export interface ErrorResponse {
  "error": {
  "code": string;
  "message": string;
  "request_id": string;
  "details"?: {
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

export type WebSurface = "nsfw-disabled" | "nsfw-enabled";

export type Lifecycle = "draft" | "active" | "suspended" | "deleted";

export interface MediaDeclaration {
  "content_type": string;
  "byte_length": number;
  "sha256": string;
}

export interface RightsAttestation {
  "basis": "owned_or_licensed";
  "subject_consent": boolean;
}

export interface TimelineAnnotation {
  "request_at_ms": number;
  "behavior_start_ms": number;
  "behavior_end_ms": number;
  "user_request": string;
}

export interface SourceAssetCreateRequest {
  "type": SourceAssetType;
  "media": MediaDeclaration;
  "annotations"?: ReadonlyArray<TimelineAnnotation>;
  "rights_attestation": RightsAttestation;
}

export interface UploadTarget {
  "method": "PUT";
  "url": string;
  "expires_at": string;
  "headers"?: {
  [key: string]: string;
};
}

export type SourceAssetStatus = "upload_pending" | "validating" | "ready" | "rejected" | "expired";

export interface SourceAsset {
  "source_asset_id": SourceAssetId;
  "type": SourceAssetType;
  "status": SourceAssetStatus;
  "media": MediaDeclaration;
  "annotations"?: ReadonlyArray<TimelineAnnotation>;
  "rights_attestation": RightsAttestation;
  "upload": UploadTarget;
  "created_at": string;
}

export interface SoulCreateRequest {
  "external_soul_id": ExternalSoulId;
  "kind": SoulKind;
  "description": string;
  "source_asset_ids": ReadonlyArray<SourceAssetId>;
}

export interface SoulUpdateRequest {
  "expected_revision": number;
  "description"?: string;
}

export interface SoulCapabilities {
  "responses": boolean;
  "image_generation": boolean;
  "video_generation": boolean;
}

export interface Soul {
  "soul_id": SoulId;
  "external_soul_id": ExternalSoulId;
  "kind": SoulKind;
  "description": string;
  "lifecycle": Lifecycle;
  "revision": number;
  "source_asset_ids": ReadonlyArray<SourceAssetId>;
  "capabilities": SoulCapabilities;
  "created_at": string;
  "updated_at": string;
}

export interface ConversationMessage {
  "role": "user" | "assistant";
  "content": string;
}

export interface ResponseCreateRequest {
  "surface": WebSurface;
  "messages": ReadonlyArray<ConversationMessage>;
  "max_output_tokens"?: number;
}

export interface QuoteReference {
  "quote_id": string;
}

export interface GenerationCreateRequest {
  "surface": WebSurface;
  "kind": "image" | "video";
  "prompt": string;
  "quote_id": string;
  "duration_ms"?: number;
  "source_asset_ids"?: ReadonlyArray<SourceAssetId>;
}

export interface ResourceReference {
  "type": "source_asset" | "soul" | "response" | "generation";
  "id": string;
}

export type OperationKind = "source_asset_validation" | "soul_creation" | "soul_update" | "soul_response" | "image_generation" | "video_generation";

export type OperationStatus = "accepted" | "submitted" | "running" | "acceptance_unknown" | "succeeded" | "failed" | "canceled";

export interface OperationFailure {
  "code": string;
  "message": string;
  "retryable": boolean;
}

export interface OperationUsage {
  "reserved_gems": number;
  "consumed_gems": number;
  "released_gems": number;
}

export type MediaLocator = DirectImageLocator | ExpiringMediaLocator;

export interface DirectImageLocator {
  "kind": "image";
  "url": string;
}

export interface ExpiringMediaLocator {
  "kind": "image" | "video";
  "url": string;
  "expires_at": string;
}

export interface OperationOutput {
  "kind": "text" | "image" | "video";
  "text"?: string;
  "media"?: ReadonlyArray<MediaLocator>;
}

export interface OperationLinks {
  "self": string;
}

export interface OperationBase {
  "operation_id": OperationId;
  "status": OperationStatus;
  "resource"?: ResourceReference;
  "progress_percent"?: number;
  "quote"?: QuoteReference;
  "usage"?: OperationUsage;
  "failure"?: OperationFailure;
  "output"?: OperationOutput;
  "created_at": string;
  "updated_at": string;
  "links"?: OperationLinks;
}

export type SharedOperation = OperationBase & {
  "kind": "source_asset_validation" | "soul_creation" | "soul_update";
};

export type SurfaceOwnedOperation = OperationBase & {
  "kind": "soul_response" | "image_generation" | "video_generation";
  "surface": WebSurface;
};

export type Operation = SharedOperation | SurfaceOwnedOperation;

export interface OperationAcceptedResponse {
  "operation": Operation;
}

export interface SourceAssetAcceptedResponse {
  "source_asset": SourceAsset;
  "operation": Operation;
}

export interface SoulAcceptedResponse {
  "soul": Soul;
  "operation": Operation;
}

export interface SoulUpdateAcceptedResponse {
  "soul": Soul;
  "operation": Operation;
}

export type ProductActionIdempotencyKey = string;

export type ManagedProductSoulId = string;

export interface ProductSoulMonetizationRequest {
  "expectedProjectionRevision": string;
  "replacedSoulId"?: unknown;
}

export interface ProductSoulUnmonetizationRequest {
  "expectedProjectionRevision": string;
}

export type ProductSoulPublishRequest = Record<string, unknown>;

export interface ProductPostRequest {
  "caption": string;
  "mediaType": "image" | "video";
  "entityId"?: unknown;
  "mediaAttachments"?: ReadonlyArray<Record<string, unknown>>;
  "imageAttachments"?: ReadonlyArray<Record<string, unknown>>;
  "mediaFitMode"?: string;
  "muxUploadId"?: string;
  "muxAssetId"?: string;
  "muxPlaybackId"?: string;
  "duration"?: number;
  "rawDimensions"?: Record<string, unknown>;
  "matteAnalysis"?: Record<string, unknown>;
  "cloudflareImageId"?: string;
  "imageUrl"?: string;
  "pendingUploadId"?: string;
  "isPrivate"?: boolean;
  "privateAccessMode"?: string;
  "ppvCostGems"?: number;
  "involvedSouls"?: ReadonlyArray<Record<string, unknown>>;
}

export interface ProductMediaUploadRequest {
  "operation"?: "create" | "finalize";
  "surface": string;
  "mediaType": "image" | "video";
  "imageId"?: string;
  "pendingId"?: string;
}

export interface ProductGenerateRequest {
  "version": 2 | 3;
  "safetyClass"?: "sfw" | "nsfw";
  "outputOwner": {
  "entityId": unknown;
};
  "prompt": string;
  "controls": {
  "modality": "image";
  "quality": "low" | "regular" | "high";
  "durationSeconds": null;
} | {
  "modality": "video";
  "quality": "low" | "regular" | "high";
  "durationSeconds": number;
};
  "references": ReadonlyArray<{
  "id": string;
  "source": {
  "type": "post_image";
  "postId": string;
  "position": number;
  "assetId"?: unknown;
} | {
  "type": "post_video_frame";
  "postId": string;
  "position": number;
  "assetId": string;
  "frameTimeSeconds": number;
} | {
  "type": "uploaded_asset";
  "assetId": string;
  "pendingUploadId": string;
  "mediaType": "image" | "video";
} | {
  "type": "media_asset";
  "assetId": string;
};
}>;
  "upfrontPricingAuthorization"?: Record<string, unknown>;
  "expectedCommercialCommitment"?: Record<string, unknown>;
  "refinementActionId"?: string;
  "refinementPreparationId"?: string;
}

export interface AccountConversationStartBody {
  "targetUserId": string;
  "recipientEntityId"?: unknown;
  "entityId"?: unknown;
}

export interface AccountConversationSendBody {
  "body"?: string;
  "media"?: ReadonlyArray<Record<string, unknown>>;
  "lockOffer"?: boolean;
  "offerCost"?: unknown;
  "recipientEntityId"?: unknown;
  "replyToMessageId"?: string;
  "nextMessageBilling"?: Record<string, unknown>;
  "billing"?: Record<string, unknown>;
}

export interface CreateAccountSoulRequest {
  "body"?: {
  "setupActionId"?: string;
  "actionId"?: string;
  "sourceDescription"?: string;
  "requestedIdentity"?: Record<string, unknown>;
  "pendingUploadId"?: string;
  "cloudflareImageId"?: string;
  "references"?: ReadonlyArray<Record<string, unknown>>;
  "expectedCommercialCommitment"?: Record<string, unknown>;
};
  "query"?: Record<string, unknown>;
}

export interface GetAccountSoulRequest {
  "body"?: Record<string, unknown>;
  "query"?: {
  "entityId"?: string;
};
}

export interface ListAccountSoulDraftsRequest {
  "body"?: Record<string, unknown>;
  "query"?: Record<string, unknown>;
}

export interface GetAccountSoulDraftRequest {
  "body"?: Record<string, unknown>;
  "query"?: {
  "draftId"?: string;
  "inspiration"?: string;
};
}

export interface UpdateAccountSoulDetailsRequest {
  "body"?: {
  "draftId"?: string;
  "expectedRevision"?: number;
  "profileHandle"?: string;
  "publicHandlePolicyVersion"?: 3;
  "displayName"?: string;
  "spokenLanguages"?: ReadonlyArray<string>;
  "lore"?: string;
  "soulTagging"?: Record<string, unknown>;
};
  "query"?: Record<string, unknown>;
}

export interface GenerateAccountSoulLooksRequest {
  "body"?: {
  "draftId"?: string;
  "expectedRevision"?: number;
  "actionId"?: string;
  "sourceDescription"?: string;
  "requestedIdentity"?: Record<string, unknown>;
  "references"?: ReadonlyArray<Record<string, unknown>>;
  "pendingUploadId"?: string;
  "cloudflareImageId"?: string;
  "expectedCommercialCommitment"?: Record<string, unknown>;
};
  "query"?: Record<string, unknown>;
}

export interface GenerateAccountSoulVoiceRequest {
  "body"?: {
  "draftId"?: string;
  "expectedRevision"?: number;
  "actionId"?: string;
  "prompt"?: string;
  "expectedCommercialCommitment"?: Record<string, unknown>;
};
  "query"?: Record<string, unknown>;
}

export interface SelectAccountSoulVoiceRequest {
  "body"?: {
  "draftId"?: string;
  "expectedRevision"?: number;
  "candidateId"?: string;
};
  "query"?: Record<string, unknown>;
}

export interface UpdateAccountSoulLanguagesRequest {
  "body"?: {
  "draftId"?: string;
  "expectedDetailsRevision"?: number;
  "expectedRevision"?: number;
  "spokenLanguages"?: ReadonlyArray<string>;
};
  "query"?: Record<string, unknown>;
}

export interface ReviewAccountSoulRequest {
  "body"?: {
  "draftId"?: string;
  "expectedRevision"?: number;
  "age"?: number;
};
  "query"?: Record<string, unknown>;
}

export interface PromoteAccountSoulRequest {
  "body"?: {
  "draftId"?: string;
  "expectedRevision"?: number;
  "expectedDetailsRevision"?: number;
  "displayName"?: string;
  "profileHandle"?: string;
  "publicHandlePolicyVersion"?: 3;
  "spokenLanguages"?: ReadonlyArray<string>;
  "loreInput"?: string;
  "publishIntentId"?: string;
};
  "query"?: Record<string, unknown>;
}

export interface GetAccountSoulLoreRequest {
  "body"?: Record<string, unknown>;
  "query"?: {
  "entityId"?: string;
};
}

export interface UpdateAccountSoulLoreRequest {
  "body"?: {
  "entityId"?: string;
  "extension"?: string;
  "addition"?: string;
  "soulTagging"?: Record<string, unknown>;
};
  "query"?: Record<string, unknown>;
}

export interface CreateAccountSoulReferenceUploadRequest {
  "body"?: Record<string, unknown>;
  "query"?: Record<string, unknown>;
}

export interface FinalizeAccountSoulReferenceUploadRequest {
  "body"?: {
  "imageId"?: string;
  "pendingId"?: string;
};
  "query"?: Record<string, unknown>;
}

export interface AbandonAccountSoulDraftRequest {
  "body"?: {
  "draftId"?: string;
  "expectedRevision"?: number;
};
  "query"?: Record<string, unknown>;
}

export interface DeleteAccountSoulDraftRequest {
  "body"?: {
  "draftId"?: string;
  "expectedRevision"?: number;
};
  "query"?: Record<string, unknown>;
}

export interface PrepareAccountSoulEditSeedRequest {
  "body"?: {
  "draftId"?: string;
  "expectedRevision"?: number;
};
  "query"?: Record<string, unknown>;
}

export interface CheckAccountSoulHandleRequest {
  "body"?: Record<string, unknown>;
  "query"?: {
  "draftId"?: string;
  "publicHandlePolicyVersion"?: string;
  "handle"?: string;
};
}

export interface StartAccountSoulConversationRequest {
  "body"?: AccountConversationStartBody;
  "query"?: Record<string, unknown>;
}

export interface CreateAccountSoulResponseRequest {
  "body"?: AccountConversationSendBody;
  "query": {
  "id": string;
  "messageId"?: string;
  "targetWindow"?: string;
  "limit"?: string;
  "cursor"?: string;
  "pricingOnly"?: string;
  "entityId"?: string;
};
}

export interface GetAccountSoulResponsesRequest {
  "body"?: Record<string, unknown>;
  "query": {
  "id": string;
  "messageId"?: string;
  "targetWindow"?: string;
  "limit"?: string;
  "cursor"?: string;
  "pricingOnly"?: string;
  "entityId"?: string;
};
}

export interface GetAccountOperationRequest {
  "body"?: Record<string, unknown>;
  "query": {
  "workflowId"?: string;
  "requestId"?: string;
  "generationId"?: string;
  "generationIds"?: string;
  "surface": string;
  "contextKey": string;
  "requesterType": "account" | "soul";
  "requesterEntityId"?: string;
  "targetSoulId"?: string;
};
}

export interface GetAccountCreatorPlanRequest {
  "body"?: Record<string, unknown>;
  "query"?: {
  "historyLimit"?: string;
};
}

export interface ProductGeneratePricingRequest {
  "version": 2 | 3;
  "safetyClass"?: "sfw" | "nsfw";
  "outputOwner": {
  "entityId": unknown;
};
  "prompt": string;
  "controls": {
  "modality": "image";
  "quality": "low" | "regular" | "high";
  "durationSeconds": null;
} | {
  "modality": "video";
  "quality": "low" | "regular" | "high";
  "durationSeconds": number;
};
  "references": ReadonlyArray<{
  "id": string;
  "source": {
  "type": "post_image";
  "postId": string;
  "position": number;
  "assetId"?: unknown;
} | {
  "type": "post_video_frame";
  "postId": string;
  "position": number;
  "assetId": string;
  "frameTimeSeconds": number;
} | {
  "type": "uploaded_asset";
  "assetId": string;
  "pendingUploadId": string;
  "mediaType": "image" | "video";
} | {
  "type": "media_asset";
  "assetId": string;
};
}>;
  "upfrontPricingAuthorization"?: Record<string, unknown>;
  "expectedCommercialCommitment"?: Record<string, unknown>;
  "refinementActionId"?: string;
  "refinementPreparationId"?: string;
  "pricingActionId"?: string;
}

export type SponsorshipIndependenceCorrectionResolution = "not_required" | "pending" | "corrected" | "already_satisfied" | "refunded_before_correction" | "manual_conflict";

export interface CreatorPerformancePayload {
  "webSurface"?: CreatorMetricsWebSurface;
  "currentActiveSubscribers": number | null;
  "currentMonth": CreatorPerformanceRow;
  "history": ReadonlyArray<CreatorPerformanceRow>;
  "selectedMonthStart": string;
  "selectedMonth": CreatorPerformanceRow;
  "dailyHistory": ReadonlyArray<CreatorDailyPerformanceRow>;
  "gemSpendBreakdown": CreatorGemSpendBreakdown;
  "gemSpendEntries": ReadonlyArray<CreatorGemSpendEntry>;
  "gemSpendEntriesTotal": number;
  "gemSpendEntriesLimit": number;
  "gemSpendEntriesOffset": number;
  "gemSpendEntriesHasMore"?: boolean;
  "gemSpendEntriesNextCursor"?: string | null;
  "gemSpendCategoryFilter": CreatorGemSpendCategoryFilter;
  "subscriptionPurchases": ReadonlyArray<CreatorSubscriptionPurchaseEntry>;
  "subscriptionPurchasesLimit": number;
  "subscriptionPurchasesHasMore": boolean;
  "subscriptionPurchasesNextCursor": string | null;
  "topGemSpenders": ReadonlyArray<CreatorTopGemSpender>;
  "topPpvPosts": ReadonlyArray<CreatorTopPpvPostPerformance>;
  "topOffers": ReadonlyArray<CreatorTopOfferPerformance>;
  "activeSubscribers": ReadonlyArray<CreatorActiveSubscriber>;
  "activeSubscribersTotal": number | null;
  "activeSubscribersLimit": number;
  "activeSubscribersOffset": number;
  "activeSubscribersHasMore"?: boolean;
  "activeSubscribersNextCursor"?: string | null;
  "payoutPeriodSummary": CreatorPayoutPeriodSummary | null;
}

export interface CreatorPerformanceRow {
  "month_start": string;
  "month_end": string | null;
  "subscriptions_received": number;
  "current_active_subscribers": number | null;
  "fulfilled_gems_received": number;
  "fan_messages_received": number;
  "computed_at": string | null;
}

export interface CreatorDailyPerformanceRow {
  "day_date": string;
  "subscriptions_received": number;
  "current_active_subscribers": number | null;
  "fulfilled_gems_received": number;
  "fan_messages_received": number;
  "computed_at": string | null;
}

export interface CreatorGemSpendBreakdown {
  "tips": number;
  "messages": number;
  "offers": number;
  "other": number;
}

export interface CreatorGemSpendEntry {
  "id": string;
  "occurred_at": string;
  "spender_user_id": string | null;
  "spender_conversation_id": string | null;
  "spender_username": string | null;
  "purpose": string;
  "category": CreatorGemSpendCategory;
  "context_type": string | null;
  "context_label": string | null;
  "gems": number;
  "real_gem_half_units": number;
  "bonus_gem_half_units": number;
  "legacy_bonus_gem_half_units": number;
  "funding_basis": "wallet" | "legacy_performance_credit" | "legacy_unclassified";
  "status": string;
  "recovery": CreatorRecoveryPresentation;
  "earnings_eligibility": CreatorEarningsEligibilityPresentation;
}

export type CreatorGemSpendCategory = "tips" | "messages" | "offers" | "other";

export interface CreatorRecoveryPresentation {
  "affected": boolean;
  "amount_cents": number;
  "source_kind": "spend" | "subscription" | "sponsorship_policy_correction" | null;
  "reason_code": string | null;
}

export interface CreatorEarningsEligibilityPresentation {
  "eligible": boolean | null;
  "reason": string | null;
  "snapshot_id": string | null;
  "participation_policy"?: "requires_monetized_soul" | "independent_of_creator_plan" | null;
  "participation_policy_version"?: number | null;
  "correction_required"?: boolean;
  "correction_resolution"?: SponsorshipIndependenceCorrectionResolution | null;
}

export type CreatorGemSpendCategoryFilter = CreatorGemSpendCategory | "all";

export interface CreatorSubscriptionPurchaseEntry {
  "id": string;
  "occurred_at": string;
  "purchaser_user_id": string;
  "purchaser_conversation_id": string | null;
  "purchaser_username": string | null;
  "purchaser_display_name": string | null;
  "amount_cents": number;
  "currency": string;
  "provider": string | null;
  "recovery": CreatorRecoveryPresentation;
  "earnings_eligibility": CreatorEarningsEligibilityPresentation;
}

export interface CreatorTopGemSpender {
  "spender_user_id": string;
  "spender_conversation_id": string | null;
  "spender_username": string | null;
  "spender_display_name": string | null;
  "spender_image": string | null;
  "total_gems": number;
  "spend_count": number;
  "last_spend_at": string | null;
  "breakdown": CreatorGemSpendBreakdown;
}

export interface CreatorTopPpvPostPerformance {
  "post_id": string;
  "caption": string | null;
  "current_ppv_cost_gems": number;
  "total_gems": number;
  "purchase_count": number;
  "buyer_count": number;
  "last_purchased_at": string | null;
  "post_created_at": string | null;
}

export interface CreatorTopOfferPerformance {
  "offer_id": string;
  "description": string | null;
  "media_type": string | null;
  "source_cost_gems": number;
  "source_created_at": string | null;
  "preview_url": string | null;
  "cloudflare_image_id": string | null;
  "mux_playback_id": string | null;
  "total_gems": number;
  "purchase_count": number;
  "buyer_count": number;
  "reuse_purchase_count": number;
  "last_purchased_at": string | null;
}

export interface CreatorActiveSubscriber {
  "subscriber_user_id": string;
  "subscriber_conversation_id": string | null;
  "subscriber_username": string | null;
  "subscriber_display_name": string | null;
  "subscriber_image": string | null;
  "access_grant_type": "subscription" | "soul_subscription" | "free_until" | "admin_grant" | "promo";
  "access_until": string | null;
  "subscription_status": string | null;
  "subscribed_at": string | null;
}

export interface CreatorPayoutPeriodSummary {
  "creator_id": string;
  "period_start": string;
  "period_end": string;
  "currency": "USD";
  "totals": CreatorPayoutPeriodTotals;
}

export interface CreatorPayoutPeriodTotals {
  "performance_gems": number;
  "earnings_gems": number;
  "performance_value_cents": number;
  "earnings_value_cents": number;
  "bonus_value_cents": number;
  "platform_cost_cents": number;
  "gross_earnings_cents": number;
  "creator_profit_cents": number;
  "creator_net_profit_cents": number;
  "raw_creator_net_profit_cents": number;
  "recovery_liability_cents": number;
  "recovery_applied_cents": number;
  "outstanding_liability_cents": number;
  "effective_creator_net_profit_cents": number;
  "recovered": boolean;
  "reversed": boolean;
  "subscription_charge_cents": number;
  "subscription_transaction_fee_cents": number;
  "subscription_creator_net_profit_cents": number;
  "referral_bonus_cents": number;
  "remix_redemption_earnings_cents": number;
}

export interface CreatorPerformanceGraph {
  "entityId": string;
  "webSurface": CreatorMetricsWebSurface;
  "view": "analytics" | "earnings";
  "period": CreatorPerformanceGraphPeriod;
  "start": string;
  "end": string;
  "granularity": "hour" | "day";
  "earningsUnavailableReason": "canonical_period_earnings_unavailable" | null;
  "points": ReadonlyArray<CreatorPerformanceGraphPoint>;
}

export type CreatorPerformanceGraphPeriod = "day" | "week" | "month" | "year";

export interface CreatorPerformanceGraphPoint {
  "at": string;
  "subscriptions_received": number | null;
  "current_active_subscribers": number | null;
  "fulfilled_gems_received": number | null;
  "fan_messages_received": number | null;
  "creator_net_profit_cents": number | null;
  "referral_bonus_cents": number | null;
}

export interface accountSoulSettingsSchema {
  "schemaVersion": 1;
  "entityId": string;
  "surface": "nsfw-disabled" | "nsfw-enabled";
  "profile": {
  "handle": string;
  "displayName": string;
  "bio": string | null;
  "status": string;
  "webSurfaceVisibility": "com" | "red" | "both" | null;
  "identityBasicsLocked": boolean;
  "identityLocked": boolean;
  "identitySetupComplete": boolean;
  "remixSourceShareBasisPoints": number | null;
};
  "automation": {
  "enableAutomatedResponsesOffers": boolean;
  "enableAudioMessageGeneration": boolean;
  "enableVisualOfferGeneration": boolean;
  "enablePrivateAssetManagement": boolean;
  "enableSponsorshipRequests": boolean;
  "enableGemSpend": boolean;
} | null;
  "nsfwCreationMode": "never" | "only_in_messages" | "always" | null;
  "likeness": {
  "consumerPolicy": "only_me" | "mutuals" | "everyone";
};
  "subscription": {
  "priceCents": number | null;
  "planPriceId": string | null;
  "discountAudience": "all" | "referred" | "none" | null;
  "discountVersion": number | null;
};
  "offerPrices": {
  "image": {
  "valueCents": number;
  "visibleGems": number;
  "gemValueVersionId": string | null;
  "pricePolicyVersionId": string | null;
};
  "video": {
  "valueCents": number;
  "visibleGems": number;
  "gemValueVersionId": string | null;
  "pricePolicyVersionId": string | null;
};
} | null;
  "generationPriceBounds": {
  "image": {
  "minValueCents": number;
  "maxValueCents": number;
  "minVisibleGems": number;
  "maxVisibleGems": number;
  "policyVersionId": string | null;
  "source": "catalog" | "fallback";
};
  "video": {
  "minValueCents": number;
  "maxValueCents": number;
  "minVisibleGems": number;
  "maxVisibleGems": number;
  "policyVersionId": string | null;
  "source": "catalog" | "fallback";
};
};
  "messageTerms": {
  "mode": "creator_funded" | "fan_paid";
  "configuredFanPriceValueCents": number;
  "chargedFanPriceValueCents": number;
  "fanPriceHalfGemUnits": number;
  "version": number;
  "operationCostPolicyVersionId": string;
  "priceBoundsPolicyVersionId": string;
  "gemValueVersionId": string;
} | null;
  "fanMessageBudget": {
  "enabled": boolean;
  "allocatedValueCents": number;
  "availableValueCents": number;
  "consumedValueCents": number;
  "version": number;
} | null;
  "nativeProfileAvailable": boolean;
  "automationMutation": {
  "fields": ReadonlyArray<"enableAutomatedResponsesOffers" | "enableAudioMessageGeneration" | "enableVisualOfferGeneration" | "enablePrivateAssetManagement" | "enableSponsorshipRequests">;
  "nativeCas": false;
  "durableReplayJournal": false;
};
}

export interface accountSoulAutomationInputSchema {
  "entityId": string;
  "enableAutomatedResponsesOffers"?: boolean;
  "enableAudioMessageGeneration"?: boolean;
  "enableVisualOfferGeneration"?: boolean;
  "enablePrivateAssetManagement"?: boolean;
  "enableSponsorshipRequests"?: boolean;
}

export interface accountSoulAutomationReceiptSchema {
  "kind": "creator-automation-preferences";
  "schemaVersion": 1;
  "accountId": string;
  "entityId": string;
  "preferences": {
  "enableAutomatedResponsesOffers": boolean;
  "enableAudioMessageGeneration": boolean;
  "enableVisualOfferGeneration": boolean;
  "enablePrivateAssetManagement": boolean;
  "enableSponsorshipRequests": boolean;
  "enableGemSpend": boolean;
};
}

export type CreatorMetricsWebSurface = "nsfw-disabled" | "nsfw-enabled";

export interface ListAccountConversationsRequest {
  "query"?: {
  "id"?: string;
  "q"?: string;
  "cursor"?: string;
  "limit"?: string;
};
  "body"?: Record<string, unknown>;
}

export interface GetAccountUnreadMessageCountRequest {
  "query"?: Record<string, unknown>;
  "body"?: Record<string, unknown>;
}

export interface MarkAccountConversationReadRequest {
  "query"?: Record<string, unknown>;
  "body": {
  "conversationId": string;
  "readThroughMessageId": string;
  "reason"?: string;
};
}

export interface GetAccountCreatorPerformanceRequest {
  "query": {
  "entityId": string;
  "month"?: string;
  "category"?: "all" | "tips" | "messages" | "offers" | "other";
  "limit"?: string;
  "gem_spend_cursor"?: string;
  "subscription_purchase_limit"?: string;
  "subscription_purchase_cursor"?: string;
  "subscriber_limit"?: string;
  "subscriber_cursor"?: string;
};
  "body"?: Record<string, unknown>;
}

export interface GetAccountCreatorPerformanceGraphRequest {
  "query": {
  "entityId": string;
  "period": "day" | "week" | "month" | "year";
  "start": string;
  "view"?: "analytics" | "earnings";
};
  "body"?: Record<string, unknown>;
}

export interface GetAccountSoulSettingsRequest {
  "query": {
  "entityId": string;
};
  "body"?: Record<string, unknown>;
}

export interface UpdateAccountSoulAutomationPreferencesRequest {
  "query"?: Record<string, unknown>;
  "body": accountSoulAutomationInputSchema;
}

export interface MessageSendBillingPreview {
  "source": "not_applicable" | "subscription_free_message" | "creator_budget" | "bonus_gems" | "real_gems";
  "affordable": boolean;
  "chargedVisibleGems": number;
  "visibleGemHalfUnits"?: number | null;
  "chargedValueCents": number;
  "fanPayableValueCents"?: number | null;
  "fanPayableHalfGemUnits"?: number | null;
  "freeMessagesRemaining": number | null;
  "freeMessagesTotal"?: number | null;
  "bonusMessageUnitsRemaining": number | null;
  "availableBoughtValueCents": number;
  "availableBonusValueCents": number;
  "resolvedAt"?: string | null;
  "expiresAt"?: string | null;
  "payer"?: "none" | "creator_budget" | "subscription_benefit" | "fan" | null;
  "fanChargeState"?: "free" | "paid" | null;
  "policyVersionId"?: string | null;
  "gemValueVersionId"?: string | null;
  "creatorBudgetId"?: string | null;
  "creatorBudgetVersion"?: number | null;
  "commercialTermsId"?: string | null;
  "commercialTermsVersion"?: number | null;
  "commercialTermsMode"?: "creator_funded" | "fan_paid" | null;
  "configuredFanPriceValueCents"?: number | null;
  "chargedFanPriceValueCents"?: number | null;
  "fanPriceHalfGemUnits"?: number | null;
  "effectiveMinValueCents"?: number | null;
  "effectiveMinHalfGemUnits"?: number | null;
  "maxValueCents"?: number | null;
  "maxHalfGemUnits"?: number | null;
  "operationCostValueCents"?: number | null;
  "operationCostPolicyVersionId"?: string | null;
  "priceBoundsPolicyVersionId"?: string | null;
  "centsPerGemSnapshot"?: number | null;
  "bonusEligible"?: boolean | null;
  "bonusAllowancePolicyVersionId"?: string | null;
  "dependencyFingerprint"?: string | null;
}

export interface MessageSendBillingExpectedTerms {
  "source": "not_applicable" | "subscription_free_message" | "creator_budget" | "bonus_gems" | "real_gems";
  "payer": "none" | "creator_budget" | "subscription_benefit" | "fan";
  "fanChargeState": "free" | "paid";
  "chargedVisibleGems": number;
  "visibleGemHalfUnits"?: number | null;
  "chargedValueCents": number;
  "resolvedAt": string;
  "expiresAt": string;
  "policyVersionId": string | null;
  "gemValueVersionId": string | null;
  "creatorBudgetId": string | null;
  "creatorBudgetVersion": number | null;
  "commercialTermsId"?: string | null;
  "commercialTermsVersion"?: number | null;
  "commercialTermsMode"?: "creator_funded" | "fan_paid" | null;
  "configuredFanPriceValueCents"?: number | null;
  "chargedFanPriceValueCents"?: number | null;
  "fanPriceHalfGemUnits"?: number | null;
  "effectiveMinValueCents"?: number | null;
  "effectiveMinHalfGemUnits"?: number | null;
  "maxValueCents"?: number | null;
  "maxHalfGemUnits"?: number | null;
  "operationCostValueCents"?: number | null;
  "operationCostPolicyVersionId"?: string | null;
  "priceBoundsPolicyVersionId"?: string | null;
  "centsPerGemSnapshot"?: number | null;
  "bonusEligible"?: boolean | null;
  "bonusAllowancePolicyVersionId"?: string | null;
  "dependencyFingerprint"?: string | null;
}

export interface AccountMessagePricingOnlyResponse {
  "beforeSendDisclosureEnabled": boolean;
  "nextMessageBilling": MessageSendBillingPreview;
  "pricingPolicyVersionId": string | null;
}

export interface AccountSoulFundingQuote {
  "actionId": string;
  "quoteId": string;
  "entityId": string;
  "webSurface": "nsfw-disabled" | "nsfw-enabled";
  "messageCount": number;
  "configuredValueCents": number;
  "chargeValueCents": number;
  "visibleGems": number;
  "visibleGemHalfUnits": number;
  "termsVersion": number;
  "budgetVersion": number;
  "operationCostValueCents": number;
  "operationCostPolicyVersionId": string;
  "gemValueVersionId": string;
  "gemValueVersion": number;
  "centsPerGemSnapshot": number;
  "roundingPolicy": {
  "visible": "half_gem_ceil";
  "charge": "round_half_up" | "floor" | "ceil";
};
  "resolvedAt": string;
  "expiresAt": string;
  "dependencyFingerprint": string;
  "maxMessageCount": number;
}

export interface AccountSoulMessageBudgetSafe {
  "id": string;
  "entityId": string;
  "enabled": boolean;
  "allocatedValueCents": number;
  "availableValueCents": number;
  "consumedValueCents": number;
  "version": number;
  "gemValueVersionId": string | null;
  "centsPerGemSnapshot": number | null;
  "loadedRealBudgetCents": number;
  "loadedRealBudgetVisibleGems": number;
  "minVisibleGems": number;
  "maxVisibleGems": number;
  "quoteVersion": number;
  "policyVersion": number | null;
  "createdAt": string | null;
  "updatedAt": string | null;
}

export interface AccountSoulDiscountPolicy {
  "entityId": string;
  "version": number;
  "discountAudience": "all" | "referred" | "none";
  "status": "active" | "retired" | "draft";
  "effectiveFrom": string | null;
  "effectiveTo": string | null;
}

export interface AccountSoulDiscountPreview {
  "status": "available" | "disabled" | "unavailable";
  "audience": "all" | "referred" | "none";
  "baseAmountCents": number;
  "discountedAmountCents": number | null;
  "currency": string;
  "intervalDays": number;
  "reason": string | null;
}

export interface AccountSoulEconomicMutationAcknowledgment {
  "success": true;
  "entityId": string;
}

export interface AccountSoulEconomicMutationOutcomeUnknown {
  "error": "native_success_projection_unavailable";
  "outcome": "mutation_outcome_unknown";
  "reconciliationRequired": true;
  "automaticRetryAllowed": false;
}

export interface AccountSoulEconomicReadProjectionUnavailable {
  "error": "native_success_projection_unavailable";
  "outcome": "read_projection_unavailable";
  "reconciliationRequired": false;
  "automaticRetryAllowed": false;
}

export interface UpdateAccountSoulGenerationPricesInput {
  "entityId": string;
  "contentOfferImagePriceGems": number;
  "contentOfferVideoPriceGems": number;
}

export interface UpdateAccountSoulSubscriptionPriceInput {
  "entityId": string;
  "subscriptionPriceCents": number;
}

export interface GetAccountSoulDiscountAudienceInput {
  "entityId": string;
  "baseAmountCents"?: string;
  "subscriptionPlanPriceId"?: string;
}

export interface UpdateAccountSoulDiscountAudienceInput {
  "entityId": string;
  "discountAudience": "all" | "referred" | "none";
  "reason"?: string;
}

export interface UpdateAccountSoulMessageTermsInput {
  "entityId": string;
  "fanMessageCommercialTermsMode": "creator_funded" | "fan_paid";
  "fanMessagePriceHalfGemUnits"?: number | null;
  "fanMessageCommercialTermsExpectedVersion"?: number | null;
}

export interface SetAccountSoulMessageBudgetEnabledInput {
  "entityId": string;
  "enableFanMessageBudget": boolean;
  "fanMessageBudgetExpectedVersion"?: number | null;
}

export interface PrepareAccountSoulMessageBudgetInput {
  "entityId": string;
  "messageCount": number;
}

export interface CommitAccountSoulMessageBudgetInput {
  "entityId": string;
  "quote": AccountSoulFundingQuote;
}

export interface getAccountSoulLikenessPolicyInput {
  "entityId": string;
}

export interface updateAccountSoulLikenessPolicyInput {
  "entityId": string;
  "consumerPolicy": "only_me" | "mutuals" | "everyone";
}

export interface updateAccountSoulSurfaceVisibilityInput {
  "entityId": string;
  "webSurfaceVisibility": "com" | "red" | "both";
  "expectedWebSurfaceVisibility": "com" | "red" | "both";
}

export interface updateAccountSoulHandleInput {
  "entityId": string;
  "profileHandle": string;
  "expectedCurrentHandle": string | null;
  "publicHandlePolicyVersion": 3;
}

export interface updateAccountSoulDisplayNameInput {
  "entityId": string;
  "displayName": string | null;
}

export interface updateAccountSoulBioInput {
  "entityId": string;
  "bio": string | null;
}

export interface deleteAccountSoulInput {
  "entityId": string;
  "actionId": string;
}

export interface AccountSoulNonfinancialLikenessResponse {
  "policy": {
  "entityId": string;
  "consumerPolicy": "only_me" | "mutuals" | "everyone";
};
}

export interface AccountSoulNonfinancialProfileResponse {
  "entity": {
  "entityId": string;
  "handle": string;
  "displayName": string;
  "bio": string | null;
  "status": string;
  "webSurfaceVisibility": "com" | "red" | "both" | null;
};
}

export interface AccountSoulNonfinancialDisplayNameResponse {
  "entityId": string;
  "updated": true;
}

export interface AccountSoulNonfinancialBioResponse {
  "entityId": string;
  "bio": string | null;
}

export interface AccountSoulNonfinancialDeletionResponse {
  "deletion": {
  "requestId": string;
  "entityId": string;
  "state": "accepted" | "pending" | "completed" | "failed";
  "phase": string;
  "blockerCodes": ReadonlyArray<string>;
  "nextTransitionAt": string | null;
  "revision": number;
  "requestedAt": string;
  "finalizedAt": string | null;
};
  "statusLookup": {
  "operationId": "getAccountSoulDeletionStatus";
  "query": {
  "requestId": string;
  "entityId": string;
};
};
  "terminal": boolean;
}

export interface AccountSoulMutationOutcomeUnknown {
  "error": "native_success_projection_unavailable";
  "outcome": "mutation_outcome_unknown";
  "nativeStatus": number;
  "reconciliationRequired": true;
  "automaticRetryAllowed": false;
}

export interface AccountSoulDeletionStatusQuery {
  "entityId": string;
  "requestId": string;
}

export interface AccountSoulDeletionStatusResponse {
  "deletion": {
  "requestId": string;
  "entityId": string;
  "state": "accepted" | "pending" | "completed" | "failed";
  "phase": string;
  "blockerCodes": ReadonlyArray<string>;
  "nextTransitionAt": string | null;
  "revision": number;
  "requestedAt": string;
  "finalizedAt": string | null;
};
}

export interface UpdateAccountSoulGenerationPricesRequest {
  "body": UpdateAccountSoulGenerationPricesInput;
}

export interface UpdateAccountSoulSubscriptionPriceRequest {
  "body": UpdateAccountSoulSubscriptionPriceInput;
}

export interface GetAccountSoulDiscountAudienceRequest {
  "query": GetAccountSoulDiscountAudienceInput;
}

export interface UpdateAccountSoulDiscountAudienceRequest {
  "body": UpdateAccountSoulDiscountAudienceInput;
}

export interface UpdateAccountSoulMessageTermsRequest {
  "body": UpdateAccountSoulMessageTermsInput;
}

export interface SetAccountSoulMessageBudgetEnabledRequest {
  "body": SetAccountSoulMessageBudgetEnabledInput;
}

export interface PrepareAccountSoulMessageBudgetRequest {
  "body": PrepareAccountSoulMessageBudgetInput;
}

export interface CommitAccountSoulMessageBudgetRequest {
  "body": CommitAccountSoulMessageBudgetInput;
}

export interface GetAccountSoulLikenessPolicyRequest {
  "query": getAccountSoulLikenessPolicyInput;
}

export interface UpdateAccountSoulLikenessPolicyRequest {
  "body": updateAccountSoulLikenessPolicyInput;
}

export interface UpdateAccountSoulSurfaceVisibilityRequest {
  "body": updateAccountSoulSurfaceVisibilityInput;
}

export interface UpdateAccountSoulHandleRequest {
  "body": updateAccountSoulHandleInput;
}

export interface UpdateAccountSoulDisplayNameRequest {
  "body": updateAccountSoulDisplayNameInput;
}

export interface UpdateAccountSoulBioRequest {
  "body": updateAccountSoulBioInput;
}

export interface DeleteAccountSoulRequest {
  "body": deleteAccountSoulInput;
}

export interface GetAccountSoulDeletionStatusRequest {
  "query": AccountSoulDeletionStatusQuery;
}
