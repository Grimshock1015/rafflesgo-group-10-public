import nodemailer from 'nodemailer';

export class EmailService {
    private transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
            connectionTimeout: 5000,  // 5 seconds to establish connection
            greetingTimeout: 5000,    // 5 seconds to receive greeting from server
            socketTimeout: 10000,     // 10 seconds of inactivity before timeout
        });
    }

    async sendWalkReminderEmail(
        toEmail: string,
        walkName: string,
        date: string,
        startTime: string,
        endTime: string,
        weather?: { precipitationProbability: number; summary: string } | null,
    ): Promise<void> {
        const formattedDate = new Intl.DateTimeFormat('en-SG', {
            dateStyle: 'full',
            timeZone: 'UTC',
        }).format(new Date(date));

        // Only include the weather block if conditions are actually bad
        const weatherBlock = weather
            ? `
            <div style="margin-top:16px; padding:12px 16px; border-left:4px solid #e67e22; background:#fef9e7;">
                <strong>&#9888;&#65039; Weather Alert</strong>
                <p>Forecast shows <strong>${weather.summary}</strong> near your walk start time, with about <strong>${weather.precipitationProbability}%</strong> chance of precipitation. Please bring rain gear and plan for wet conditions.</p>
            </div>`
            : '';

        await this.transporter.sendMail({
            from: `"RafflesGo" <${process.env.GMAIL_USER}>`,
            to: toEmail,
            subject: `Reminder: You have a survey walk tomorrow`,
            html: `
                <p>Hi,</p>
                <p>This is a reminder that you have a survey walk scheduled for tomorrow.</p>
                <table cellpadding="6">
                    <tr><td><strong>Walk</strong></td><td>${walkName}</td></tr>
                    <tr><td><strong>Date</strong></td><td>${formattedDate}</td></tr>
                    <tr><td><strong>Time</strong></td><td>${startTime} - ${endTime}</td></tr>
                </table>
                ${weatherBlock}
                <p>See you there!</p>
            `,
        });
    }

    // Sent to the walk leader ~1 hour after the walk ends, reminding them to submit sighting and mark attendance
    async sendLeaderReminderEmail(
        toEmail: string,
        walkName: string,
        date: string,
        startTime: string,
    ): Promise<void> {
        const formattedDate = new Intl.DateTimeFormat('en-SG', {
            dateStyle: 'full',
            timeZone: 'UTC',
        }).format(new Date(date));

        const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';

        await this.transporter.sendMail({
            from: `"RafflesGo" <${process.env.GMAIL_USER}>`,
            to: toEmail,
            subject: `Action needed: Submit sighting and mark attendance for "${walkName}"`,
            html: `
                <p>Hi,</p>
                <p>Your survey walk <strong>${walkName}</strong> on ${formattedDate} at ${startTime} has ended.</p>
                <p>Please remember to:</p>
                <ol>
                    <li><strong>Submit your sighting</strong> — go to the app and submit your observation record.</li>
                    <li><strong>Mark attendance</strong> — go to <a href="${frontendUrl}/survey-walks">Survey Walks</a>, find your walk, and click <strong>Mark Complete</strong> to record who attended.</li>
                </ol>
                <p>Thank you for leading the walk!</p>
            `,
        });
    }

    // Sent to volunteers who attended after the leader marks attendance
    async sendAttendedEmail(
        toEmail: string,
        walkName: string,
        attendedCountThisPeriod: number,
    ): Promise<void> {
        await this.transporter.sendMail({
            from: `"RafflesGo" <${process.env.GMAIL_USER}>`,
            to: toEmail,
            subject: `Thank you for attending "${walkName}"`,
            html: `
                <p>Hi,</p>
                <p>Thank you for attending the survey walk <strong>${walkName}</strong>!</p>
                <p>You have attended <strong>${attendedCountThisPeriod}</strong> walk(s) in this survey period so far. Keep it up!</p>
                <p>See you on the next one.</p>
            `,
        });
    }

    // Sent to volunteers who were registered but did not attend
    async sendMissedEmail(
        toEmail: string,
        walkName: string,
        leaderName: string,
        leaderEmail: string,
    ): Promise<void> {
        await this.transporter.sendMail({
            from: `"RafflesGo" <${process.env.GMAIL_USER}>`,
            to: toEmail,
            subject: `We missed you at "${walkName}"`,
            html: `
                <p>Hi,</p>
                <p>We noticed you were registered for <strong>${walkName}</strong> but were not marked as attended.</p>
                <p>If you did attend, please contact your walk leader to update the attendance record:</p>
                <p><strong>${leaderName}</strong> — <a href="mailto:${leaderEmail}">${leaderEmail}</a></p>
                <p>Hope to see you at the next walk!</p>
            `,
        });
    }

    async sendInvitationEmail(
        toEmail: string,
        inviterName: string,
        walkName: string,
        invitationUid: string,
    ): Promise<void> {
        const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
        const link = `${frontendUrl}/survey-walks?invitation=${invitationUid}`;

        await this.transporter.sendMail({
            from: `"RafflesGo" <${process.env.GMAIL_USER}>`,
            to: toEmail,
            subject: `You've been invited to join a survey walk`,
            html: `
                <p>Hi,</p>
                <p><strong>${inviterName}</strong> has invited you to join the survey walk <strong>${walkName}</strong>.</p>
                <p>Click the link below to accept or decline the invitation:</p>
                <a href="${link}">${link}</a>
                <p>If you don't have an account yet, you will be prompted to sign in with Google first.</p>
            `,
        });
    }
}
