import { auth } from '../lib/firebase-admin';
import { SurveyWalkRepository } from '../repositories/surveyWalk.repository';
import { EmailService } from './email.service';

export class WalkEndReminderService {
    constructor(
        private surveyWalkRepository: SurveyWalkRepository,
        private emailService: EmailService,
    ) {}

    // Checks for walks that ended 1-2 hours ago and haven't been marked complete yet.
    // Sends a reminder to the leader to submit sighting and mark attendance.
    // The 1-2 hour window prevents sending duplicate reminders if the cron runs multiple times.
    async checkAndSendLeaderReminders(): Promise<void> {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

        const todayDate = now.toISOString().split('T')[0]!;
        const walks = await this.surveyWalkRepository.findByDate(todayDate);

        // Only care about walks that are not yet finished
        const unfinishedWalks = walks.filter((walk) => !walk.isFinished);

        for (const walk of unfinishedWalks) {
            // Parse the walk's end time and combine with today's date to get a full timestamp
            const [endHour, endMinute] = walk.endTime.split(':').map(Number);
            const walkEndTime = new Date(now);
            walkEndTime.setHours(endHour ?? 0, endMinute ?? 0, 0, 0);

            // Only send if the walk ended between 1 and 2 hours ago
            if (walkEndTime < twoHoursAgo || walkEndTime > oneHourAgo) {
                continue;
            }

            try {
                const leaderUser = await auth.getUser(walk.leader);
                const leaderEmail = leaderUser.email;

                if (!leaderEmail) {
                    console.warn(`[WalkEndReminder] Leader ${walk.leader} has no email, skipping walk "${walk.name}"`);
                    continue;
                }

                await this.emailService.sendLeaderReminderEmail(
                    leaderEmail,
                    walk.name,
                    todayDate,
                    walk.startTime,
                );

                console.log(`[WalkEndReminder] Sent leader reminder to ${leaderEmail} for walk "${walk.name}"`);
            } catch (err) {
                console.error(`[WalkEndReminder] Failed to send reminder for walk "${walk.name}":`, err);
            }
        }
    }
}
