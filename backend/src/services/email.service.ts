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