import cron from 'node-cron';
import { WalkReminderService } from '../services/walkReminder.service';

// Runs every day at 8:00 PM Singapore time.
// Volunteers get the reminder the evening before their walk so they have time to prepare.
export function startWalkReminderJob(walkReminderService: WalkReminderService): void {
    cron.schedule('0 20 * * *', async () => {
        console.log('[WalkReminderJob] Running daily walk reminder...');
        try {
            await walkReminderService.sendRemindersForTomorrow();
        } catch (err) {
            console.error('[WalkReminderJob] Unexpected error during reminder run:', err);
        }
    }, {
        timezone: 'Asia/Singapore',
    });

    console.log('[WalkReminderJob] Scheduled: reminders will be sent daily at 8:00 PM SGT');
}