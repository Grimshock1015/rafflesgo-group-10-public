import { beforeEach, describe, expect, it, vi } from 'vitest';
import nodemailer from 'nodemailer';
import { EmailService } from '../../../services/email.service';

const mailerMocks = vi.hoisted(() => ({
    sendMail: vi.fn().mockResolvedValue(undefined),
    createTransport: vi.fn(),
}));

vi.mock('nodemailer', () => ({
    default: {
        createTransport: mailerMocks.createTransport,
    },
}));

describe('EmailService Unit Tests', () => {
    let service: EmailService;

    beforeEach(() => {
        vi.clearAllMocks();
        mailerMocks.createTransport.mockReturnValue({
            sendMail: mailerMocks.sendMail,
        });

        process.env.GMAIL_USER = 'raffles@example.com';
        process.env.GMAIL_APP_PASSWORD = 'app-pass';
        process.env.FRONTEND_URL = 'https://rafflesgo.example.com';

        service = new EmailService();
    });

    it('should configure nodemailer transport in constructor', () => {
        expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: 'raffles@example.com',
                pass: 'app-pass',
            },
        }));
    });

    it('should send walk reminder with weather alert block when weather is provided', async () => {
        await service.sendWalkReminderEmail('to@example.com', 'Morning Walk', '2026-04-20', '08:00', '10:00', {
            precipitationProbability: 75,
            summary: 'rain',
        });

        const payload = mailerMocks.sendMail.mock.calls[0]?.[0] as { subject: string; html: string; to: string };
        expect(payload.to).toBe('to@example.com');
        expect(payload.subject).toContain('Reminder: You have a survey walk tomorrow');
        expect(payload.html).toContain('Weather Alert');
        expect(payload.html).toContain('75%');
        expect(payload.html).toContain('rain');
    });

    it('should send walk reminder without weather alert block when weather is null', async () => {
        await service.sendWalkReminderEmail('to@example.com', 'Morning Walk', '2026-04-20', '08:00', '10:00', null);

        const payload = mailerMocks.sendMail.mock.calls[0]?.[0] as { html: string };
        expect(payload.html).not.toContain('Weather Alert');
    });

    it('should send leader reminder with survey walks link', async () => {
        await service.sendLeaderReminderEmail('leader@example.com', 'Morning Walk', '2026-04-20', '08:00');

        const payload = mailerMocks.sendMail.mock.calls[0]?.[0] as { subject: string; html: string };
        expect(payload.subject).toContain('Action needed');
        expect(payload.html).toContain('https://rafflesgo.example.com/survey-walks');
        expect(payload.html).toContain('Mark Complete');
    });

    it('should send attended email with attended count', async () => {
        await service.sendAttendedEmail('attendee@example.com', 'Morning Walk', 3);

        const payload = mailerMocks.sendMail.mock.calls[0]?.[0] as { subject: string; html: string };
        expect(payload.subject).toContain('Thank you for attending');
        expect(payload.html).toContain('3');
    });

    it('should send missed email with leader contact details', async () => {
        await service.sendMissedEmail('missed@example.com', 'Morning Walk', 'Leader Name', 'leader@example.com');

        const payload = mailerMocks.sendMail.mock.calls[0]?.[0] as { subject: string; html: string };
        expect(payload.subject).toContain('We missed you');
        expect(payload.html).toContain('Leader Name');
        expect(payload.html).toContain('mailto:leader@example.com');
    });

    it('should send walk invitation email by default type', async () => {
        await service.sendInvitationEmail('invitee@example.com', 'Leader Name', 'Morning Walk', 'inv-123');

        const payload = mailerMocks.sendMail.mock.calls[0]?.[0] as { subject: string; html: string };
        expect(payload.subject).toContain('join a survey walk');
        expect(payload.html).toContain('accept or decline the invitation');
        expect(payload.html).toContain('inv-123');
        expect(payload.html).toContain('https://rafflesgo.example.com/dashboard');
    });

    it('should send leader invitation email variant', async () => {
        await service.sendInvitationEmail(
            'invitee@example.com',
            'Leader Name',
            'Morning Walk',
            'inv-999',
            'leader_invitation',
        );

        const payload = mailerMocks.sendMail.mock.calls[0]?.[0] as { subject: string; html: string };
        expect(payload.subject).toContain('become a survey walk leader');
        expect(payload.html).toContain('leadership invitation');
    });
});
