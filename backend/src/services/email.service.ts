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
