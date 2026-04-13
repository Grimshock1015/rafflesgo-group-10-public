import { Type, Static } from '@sinclair/typebox';

export const TriggerWalkReminderResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
});

export type TriggerWalkReminderResponse = Static<typeof TriggerWalkReminderResponseSchema>;