import type { CreatorPerformancePayload, accountSoulSettingsSchema } from '../dist/generated.js';
const count: CreatorPerformancePayload['currentActiveSubscribers'] = null;
const numberCount: CreatorPerformancePayload['currentActiveSubscribers'] = 3;
// @ts-expect-error Nullable numeric metrics must not degrade to unknown through JSON null conversion.
const invalidCount: CreatorPerformancePayload['currentActiveSubscribers'] = 'not a count';
function noPayoutLeak(settings: accountSoulSettingsSchema) {
  // @ts-expect-error The safe Soul DTO never exposes the account payout profile.
  return settings.creatorUserPayoutProfile;
}
void count; void numberCount; void invalidCount; void noPayoutLeak;
