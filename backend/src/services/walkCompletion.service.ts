import { auth } from '../lib/firebase-admin';
import { SurveyWalkEntity } from '../entities/surveyWalk.entity';
import { SurveyWalkRepository } from '../repositories/surveyWalk.repository';
import { EmailService } from './email.service';

export class WalkCompletionService {
    constructor(
        private surveyWalkRepository: SurveyWalkRepository,
        private emailService: EmailService,
    ) {}

    // Called right after a walk is marked complete.
    // Sends a thank-you email to attendees and a "missed you" email to no-shows.
    async sendAttendanceEmails(walk: SurveyWalkEntity): Promise<void> {
        // Get all finished walks in the same survey period to calculate attendance count
        const periodWalks = await this.surveyWalkRepository.findBySurveyPeriodUid(walk.surveyPeriodUid);
        const finishedPeriodWalks = periodWalks.filter((w) => w.isFinished);

        // Look up leader info for the missed email contact details
        const leaderUser = await auth.getUser(walk.leader);
        const leaderName = leaderUser.displayName || leaderUser.email || 'Walk Leader';
        const leaderEmail = leaderUser.email;

        if (!leaderEmail) {
            console.warn(`[WalkCompletion] Leader ${walk.leader} has no email, skipping attendance emails for walk "${walk.name}"`);
            return;
        }

        // Send emails to all registered volunteers
        for (const uid of walk.volunteerUids) {
            try {
                const user = await auth.getUser(uid);
                const email = user.email;

                if (!email) {
                    console.warn(`[WalkCompletion] Volunteer ${uid} has no email, skipping`);
                    continue;
                }

                const attended = walk.attendeeUids.includes(uid);

                if (attended) {
                    // Count how many walks this volunteer has attended in this period
                    const attendedCount = finishedPeriodWalks.filter((w) =>
                        w.attendeeUids.includes(uid)
                    ).length;

                    await this.emailService.sendAttendedEmail(email, walk.name, attendedCount);
                    console.log(`[WalkCompletion] Sent thank-you email to ${email} for walk "${walk.name}"`);
                } else {
                    await this.emailService.sendMissedEmail(email, walk.name, leaderName, leaderEmail);
                    console.log(`[WalkCompletion] Sent missed email to ${email} for walk "${walk.name}"`);
                }
            } catch (err) {
                // One failed email shouldn't stop the rest
                console.error(`[WalkCompletion] Failed to send email to uid ${uid} for walk "${walk.name}":`, err);
            }
        }
    }
}
