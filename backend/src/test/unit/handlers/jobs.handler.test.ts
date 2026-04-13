import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { triggerWalkReminderHandler } from '../../../handlers/jobs.handler';
import { Container, resetContainer, setContainer } from '../../../container';

describe('Jobs Handlers', () => {
  let mockWalkReminderService: {
    sendRemindersForTomorrow: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockWalkReminderService = {
      sendRemindersForTomorrow: vi.fn(),
    };

    setContainer({
      walkReminderService: mockWalkReminderService,
    } as unknown as Container);
  });

  afterEach(() => {
    resetContainer();
  });

  it('should trigger walk reminders and return success response', async () => {
    mockWalkReminderService.sendRemindersForTomorrow.mockResolvedValue(undefined);

    const result = await triggerWalkReminderHandler(
      {} as unknown as Parameters<typeof triggerWalkReminderHandler>[0],
      {} as unknown as Parameters<typeof triggerWalkReminderHandler>[1]
    );

    expect(mockWalkReminderService.sendRemindersForTomorrow).toHaveBeenCalledOnce();
    expect(result).toEqual({
      success: true,
      message: 'Walk reminders triggered successfully',
    });
  });

  it('should propagate service errors', async () => {
    mockWalkReminderService.sendRemindersForTomorrow.mockRejectedValue(new Error('reminder failed'));

    await expect(
      triggerWalkReminderHandler(
        {} as unknown as Parameters<typeof triggerWalkReminderHandler>[0],
        {} as unknown as Parameters<typeof triggerWalkReminderHandler>[1]
      )
    ).rejects.toThrow('reminder failed');
  });
});