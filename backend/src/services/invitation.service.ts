import { InvitationEntity } from '../entities/invitation.entity';
import { BadRequestError, ConflictError, NotFoundError } from '../lib/errors';
import { InvitationRepository } from '../repositories/invitation.repository';
import { SurveyPeriodRepository } from '../repositories/surveyPeriod.repository';
import { SurveyWalkRepository } from '../repositories/surveyWalk.repository';
import { EmailService } from './email.service';
import { auth } from '../lib/firebase-admin';

export class InvitationService {
    constructor(
        private invitationRepository: InvitationRepository,
        private surveyWalkRepository: SurveyWalkRepository,
        private surveyPeriodRepository: SurveyPeriodRepository,
        private emailService: EmailService,
    ) {}

    async sendInvitation(
        surveyWalkUid: string,
        inviterUid: string,
        inviteeEmail: string,
    ): Promise<InvitationEntity> {
        // Check if walk exists
        const walk = await this.surveyWalkRepository.findById(surveyWalkUid);
        if (!walk) throw new NotFoundError('Survey walk', surveyWalkUid);

        // Check if walk is finished
        if (walk.isFinished) throw new BadRequestError('Cannot invite to a finished survey walk');

        // Check if survey period is finished
        const period = await this.surveyPeriodRepository.findById(walk.surveyPeriodUid);
        if (!period) throw new NotFoundError('Survey period', walk.surveyPeriodUid);
        if (period.isFinished) throw new BadRequestError('Cannot invite to a walk from a finished survey period');

        // Check if walk is at full capacity
        if (walk.volunteerUids.length >= walk.capacity) {
            throw new BadRequestError('Survey walk is already at full capacity');
        }

        // Check if a pending invitation already exists
        const existing = await this.invitationRepository.findPendingByWalkAndEmail(surveyWalkUid, inviteeEmail);
        if (existing) throw new ConflictError('An invitation has already been sent to this email for this walk');

        // Get inviter display name
        const inviterUser = await auth.getUser(inviterUid);
        const inviterName = inviterUser.displayName || inviterUser.email || 'A volunteer';

        // Create invitation record
        const invitation = await this.invitationRepository.create({
            surveyWalkUid,
            inviterUid,
            inviteeEmail,
            status: 'pending',
            createdAt: new Date(),
        });

        // Send invitation email - if it fails, mark invitation as declined (rollback)
        try {
            await this.emailService.sendInvitationEmail(inviteeEmail, inviterName, walk.name, invitation.uid);
        } catch (error) {
            await this.invitationRepository.update(invitation.uid, { status: 'declined' });
            throw new BadRequestError('Failed to send invitation email. Please try again.');
        }

        return invitation;
    }

    async getMyInvitations(userEmail: string): Promise<InvitationEntity[]> {
        const invitations = await this.invitationRepository.findByInviteeEmail(userEmail);
        return invitations.filter((inv) => inv.status === 'pending');
    }

    async getInvitationsForWalk(surveyWalkUid: string): Promise<InvitationEntity[]> {
        return this.invitationRepository.findBySurveyWalkUid(surveyWalkUid);
    }

    async acceptInvitation(
        invitationUid: string,
        userUid: string,
        userEmail: string,
    ): Promise<InvitationEntity> {
        const invitation = await this.invitationRepository.findById(invitationUid);
        if (!invitation) throw new NotFoundError('Invitation', invitationUid);
        if (invitation.inviteeEmail !== userEmail) throw new BadRequestError('This invitation was not sent to you');
        if (invitation.status !== 'pending') throw new BadRequestError('This invitation is no longer pending');

        // Join the walk (reuse existing repository logic)
        const walk = await this.surveyWalkRepository.findById(invitation.surveyWalkUid);
        if (!walk) throw new NotFoundError('Survey walk', invitation.surveyWalkUid);
        if (!walk.volunteerUids.includes(userUid)) {
            await this.surveyWalkRepository.update(invitation.surveyWalkUid, {
                volunteerUids: [...walk.volunteerUids, userUid],
                leader: walk.leader || userUid,
            });
        }

        const updated = await this.invitationRepository.update(invitationUid, { status: 'accepted' });
        return updated!;
    }

    async declineInvitation(
        invitationUid: string,
        userEmail: string,
    ): Promise<InvitationEntity> {
        const invitation = await this.invitationRepository.findById(invitationUid);
        if (!invitation) throw new NotFoundError('Invitation', invitationUid);
        if (invitation.inviteeEmail !== userEmail) throw new BadRequestError('This invitation was not sent to you');
        if (invitation.status !== 'pending') throw new BadRequestError('This invitation is no longer pending');

        const updated = await this.invitationRepository.update(invitationUid, { status: 'declined' });
        return updated!;
    }
}