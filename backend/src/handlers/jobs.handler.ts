import { getContainer } from '../container';
import { TriggerWalkReminderResponseSchema } from '../schemas/jobs.schema';
import { FastifyReplyTypeBox, FastifyRequestTypeBox } from '../types/fastify';

const TriggerWalkReminderSchema = {
  response: {
    200: TriggerWalkReminderResponseSchema,
  },
};

export async function triggerWalkReminderHandler(
  _request: FastifyRequestTypeBox<typeof TriggerWalkReminderSchema>,
  _reply: FastifyReplyTypeBox<typeof TriggerWalkReminderSchema>
) {
  const { walkReminderService } = getContainer();
  await walkReminderService.sendRemindersForTomorrow();

  return {
    success: true,
    message: 'Walk reminders triggered successfully',
  };
}