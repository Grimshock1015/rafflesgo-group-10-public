import cron from 'node-cron';
import { WalkEndReminderService } from '../services/walkEndReminder.service';

// Runs every hour at the top of the hour.
// Checks if any walks ended 1-2 hours ago and haven't been marked complete — if so, reminds the leader.
export function startWalkEndReminderJob(walkEndReminderService: WalkEndReminderService): void {
    cron.schedule('0 * * * *', async () => {
        console.log('[WalkEndReminderJob] Checking for walks that need leader reminders...');
        try {
            await walkEndReminderService.checkAndSendLeaderReminders();
        } catch (err) {
            console.error('[WalkEndReminderJob] Unexpected error:', err);
        }
    }, {
        timezone: 'Asia/Singapore',
    });

    console.log('[WalkEndReminderJob] Scheduled: checking for ended walks every hour');
}
