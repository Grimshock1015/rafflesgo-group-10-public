import { auth } from '../lib/firebase-admin';
import { SurveyWalkRepository } from '../repositories/surveyWalk.repository';
import { EmailService } from './email.service';
import { WeatherService } from './weather.service';

export class WalkReminderService {
    constructor(
        private surveyWalkRepository: SurveyWalkRepository,
        private emailService: EmailService,
        private weatherService: WeatherService,
    ) {}

    // Main entry point — checks for walks tomorrow and sends reminders to all volunteers.
    // Called by the cron job every evening.
    async sendRemindersForTomorrow(): Promise<void> {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDate = tomorrow.toISOString().split('T')[0]!; // "YYYY-MM-DD"

        const walks = await this.surveyWalkRepository.findByDate(tomorrowDate);

        // Skip walks that are already marked as finished
        const upcomingWalks = walks.filter((walk) => !walk.isFinished);

        if (upcomingWalks.length === 0) {
            console.log(`[WalkReminder] No upcoming walks found for ${tomorrowDate}, nothing to send`);
            return;
        }

        console.log(`[WalkReminder] Found ${upcomingWalks.length} walk(s) for ${tomorrowDate}`);

        for (const walk of upcomingWalks) {
            // Try to get the weather forecast — if it fails, we still send the reminder without weather info
            let weather = null;
            try {
                weather = await this.weatherService.getWeatherForDateTime(tomorrowDate, walk.startTime);
                console.log(`[WalkReminder] Weather result for "${walk.name}":`, weather ?? 'clear (no alert)');
                if (weather) {
                    console.log(`[WalkReminder] Bad weather detected for "${walk.name}": ${weather.summary} (${weather.precipitationProbability}%)`);
                }
            } catch (err) {
                console.error(`[WalkReminder] Could not fetch weather for walk "${walk.name}", skipping weather block:`, err);
            }

            // Send a reminder to each volunteer signed up for this walk
            for (const uid of walk.volunteerUids) {
                try {
                    const user = await auth.getUser(uid);
                    const email = user.email;

                    if (!email) {
                        console.warn(`[WalkReminder] User ${uid} has no email address, skipping`);
                        continue;
                    }

                    await this.emailService.sendWalkReminderEmail(
                        email,
                        walk.name,
                        tomorrowDate,
                        walk.startTime,
                        walk.endTime,
                        weather,
                    );

                    console.log(`[WalkReminder] Sent reminder to ${email} for walk "${walk.name}"`);
                } catch (err) {
                    // Log the error but keep going — one failed email shouldn't stop the rest
                    console.error(`[WalkReminder] Failed to send reminder to uid ${uid} for walk "${walk.name}":`, err);
                }
            }
        }

        console.log(`[WalkReminder] Done processing reminders for ${tomorrowDate}`);
    }
}