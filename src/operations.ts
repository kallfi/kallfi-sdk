// GENERATED FILE. Do not edit; run npm run generate.
// OpenAPI snapshot SHA-256: 742fe946d29ef7e286eead3c8cea50a8a344793b2136f843655f896daea1d99b
export const KALLFI_OPERATIONS = {
  "createSoulSourceAsset": {
    "method": "POST",
    "path": "/v1/soul-source-assets",
    "scope": "workspace",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "createSoul": {
    "method": "POST",
    "path": "/v1/souls",
    "scope": "workspace",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "getSoul": {
    "method": "GET",
    "path": "/v1/souls/{soul_id}",
    "scope": "workspace",
    "pathParameters": [
      {
        "name": "soul_id",
        "required": true
      }
    ],
    "queryParameters": [],
    "bodyAllowed": false,
    "bodyRequired": false,
    "idempotencyRequired": false
  },
  "updateSoul": {
    "method": "PATCH",
    "path": "/v1/souls/{soul_id}",
    "scope": "workspace",
    "pathParameters": [
      {
        "name": "soul_id",
        "required": true
      }
    ],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "createSoulResponse": {
    "method": "POST",
    "path": "/v1/souls/{soul_id}/responses",
    "scope": "workspace",
    "pathParameters": [
      {
        "name": "soul_id",
        "required": true
      }
    ],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "createSoulGeneration": {
    "method": "POST",
    "path": "/v1/souls/{soul_id}/generations",
    "scope": "workspace",
    "pathParameters": [
      {
        "name": "soul_id",
        "required": true
      }
    ],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "getOperation": {
    "method": "GET",
    "path": "/v1/operations/{operation_id}",
    "scope": "workspace",
    "pathParameters": [
      {
        "name": "operation_id",
        "required": true
      }
    ],
    "queryParameters": [],
    "bodyAllowed": false,
    "bodyRequired": false,
    "idempotencyRequired": false
  },
  "createPost": {
    "method": "POST",
    "path": "/v1/posts",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "createMediaUpload": {
    "method": "POST",
    "path": "/v1/media/uploads",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "preparePostGeneration": {
    "method": "POST",
    "path": "/v1/posts/generation-pricing",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "generatePost": {
    "method": "POST",
    "path": "/v1/posts/generations",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "monetizeSoul": {
    "method": "POST",
    "path": "/v1/souls/{soul_id}/monetize",
    "scope": "account",
    "pathParameters": [
      {
        "name": "soul_id",
        "required": true
      }
    ],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "unmonetizeSoul": {
    "method": "POST",
    "path": "/v1/souls/{soul_id}/unmonetize",
    "scope": "account",
    "pathParameters": [
      {
        "name": "soul_id",
        "required": true
      }
    ],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "publishSoul": {
    "method": "POST",
    "path": "/v1/souls/{soul_id}/publish",
    "scope": "account",
    "pathParameters": [
      {
        "name": "soul_id",
        "required": true
      }
    ],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "createAccountSoul": {
    "method": "POST",
    "path": "/v1/account/actions/createAccountSoul",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "getAccountSoul": {
    "method": "POST",
    "path": "/v1/account/actions/getAccountSoul",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "listAccountSoulDrafts": {
    "method": "POST",
    "path": "/v1/account/actions/listAccountSoulDrafts",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "getAccountSoulDraft": {
    "method": "POST",
    "path": "/v1/account/actions/getAccountSoulDraft",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "updateAccountSoulDetails": {
    "method": "POST",
    "path": "/v1/account/actions/updateAccountSoulDetails",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "generateAccountSoulLooks": {
    "method": "POST",
    "path": "/v1/account/actions/generateAccountSoulLooks",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "generateAccountSoulVoice": {
    "method": "POST",
    "path": "/v1/account/actions/generateAccountSoulVoice",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "selectAccountSoulVoice": {
    "method": "POST",
    "path": "/v1/account/actions/selectAccountSoulVoice",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "updateAccountSoulLanguages": {
    "method": "POST",
    "path": "/v1/account/actions/updateAccountSoulLanguages",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "reviewAccountSoul": {
    "method": "POST",
    "path": "/v1/account/actions/reviewAccountSoul",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "promoteAccountSoul": {
    "method": "POST",
    "path": "/v1/account/actions/promoteAccountSoul",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "getAccountSoulLore": {
    "method": "POST",
    "path": "/v1/account/actions/getAccountSoulLore",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "updateAccountSoulLore": {
    "method": "POST",
    "path": "/v1/account/actions/updateAccountSoulLore",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "createAccountSoulReferenceUpload": {
    "method": "POST",
    "path": "/v1/account/actions/createAccountSoulReferenceUpload",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "finalizeAccountSoulReferenceUpload": {
    "method": "POST",
    "path": "/v1/account/actions/finalizeAccountSoulReferenceUpload",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "abandonAccountSoulDraft": {
    "method": "POST",
    "path": "/v1/account/actions/abandonAccountSoulDraft",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "deleteAccountSoulDraft": {
    "method": "POST",
    "path": "/v1/account/actions/deleteAccountSoulDraft",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "prepareAccountSoulEditSeed": {
    "method": "POST",
    "path": "/v1/account/actions/prepareAccountSoulEditSeed",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "checkAccountSoulHandle": {
    "method": "POST",
    "path": "/v1/account/actions/checkAccountSoulHandle",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "startAccountSoulConversation": {
    "method": "POST",
    "path": "/v1/account/actions/startAccountSoulConversation",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "createAccountSoulResponse": {
    "method": "POST",
    "path": "/v1/account/actions/createAccountSoulResponse",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "getAccountSoulResponses": {
    "method": "POST",
    "path": "/v1/account/actions/getAccountSoulResponses",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "getAccountOperation": {
    "method": "POST",
    "path": "/v1/account/actions/getAccountOperation",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "getAccountCreatorPlan": {
    "method": "POST",
    "path": "/v1/account/actions/getAccountCreatorPlan",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "listAccountConversations": {
    "method": "POST",
    "path": "/v1/account/actions/listAccountConversations",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "getAccountUnreadMessageCount": {
    "method": "POST",
    "path": "/v1/account/actions/getAccountUnreadMessageCount",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "markAccountConversationRead": {
    "method": "POST",
    "path": "/v1/account/actions/markAccountConversationRead",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "getAccountCreatorPerformance": {
    "method": "POST",
    "path": "/v1/account/actions/getAccountCreatorPerformance",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "getAccountCreatorPerformanceGraph": {
    "method": "POST",
    "path": "/v1/account/actions/getAccountCreatorPerformanceGraph",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "getAccountSoulSettings": {
    "method": "POST",
    "path": "/v1/account/actions/getAccountSoulSettings",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "updateAccountSoulAutomationPreferences": {
    "method": "POST",
    "path": "/v1/account/actions/updateAccountSoulAutomationPreferences",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "updateAccountSoulGenerationPrices": {
    "method": "POST",
    "path": "/v1/account/actions/updateAccountSoulGenerationPrices",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "updateAccountSoulSubscriptionPrice": {
    "method": "POST",
    "path": "/v1/account/actions/updateAccountSoulSubscriptionPrice",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "getAccountSoulDiscountAudience": {
    "method": "POST",
    "path": "/v1/account/actions/getAccountSoulDiscountAudience",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "updateAccountSoulDiscountAudience": {
    "method": "POST",
    "path": "/v1/account/actions/updateAccountSoulDiscountAudience",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "updateAccountSoulMessageTerms": {
    "method": "POST",
    "path": "/v1/account/actions/updateAccountSoulMessageTerms",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "setAccountSoulMessageBudgetEnabled": {
    "method": "POST",
    "path": "/v1/account/actions/setAccountSoulMessageBudgetEnabled",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "prepareAccountSoulMessageBudget": {
    "method": "POST",
    "path": "/v1/account/actions/prepareAccountSoulMessageBudget",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "commitAccountSoulMessageBudget": {
    "method": "POST",
    "path": "/v1/account/actions/commitAccountSoulMessageBudget",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "getAccountSoulLikenessPolicy": {
    "method": "POST",
    "path": "/v1/account/actions/getAccountSoulLikenessPolicy",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "updateAccountSoulLikenessPolicy": {
    "method": "POST",
    "path": "/v1/account/actions/updateAccountSoulLikenessPolicy",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "updateAccountSoulSurfaceVisibility": {
    "method": "POST",
    "path": "/v1/account/actions/updateAccountSoulSurfaceVisibility",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "updateAccountSoulHandle": {
    "method": "POST",
    "path": "/v1/account/actions/updateAccountSoulHandle",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "updateAccountSoulDisplayName": {
    "method": "POST",
    "path": "/v1/account/actions/updateAccountSoulDisplayName",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "updateAccountSoulBio": {
    "method": "POST",
    "path": "/v1/account/actions/updateAccountSoulBio",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "deleteAccountSoul": {
    "method": "POST",
    "path": "/v1/account/actions/deleteAccountSoul",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  },
  "getAccountSoulDeletionStatus": {
    "method": "POST",
    "path": "/v1/account/actions/getAccountSoulDeletionStatus",
    "scope": "account",
    "pathParameters": [],
    "queryParameters": [],
    "bodyAllowed": true,
    "bodyRequired": true,
    "idempotencyRequired": true
  }
} as const;
export type KallfiOperationId = keyof typeof KALLFI_OPERATIONS;
