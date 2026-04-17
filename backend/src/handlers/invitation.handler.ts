import { getContainer } from '../container';
import { InvitationEntity } from '../entities/invitation.entity';
import { auth } from '../lib/firebase-admin';
import {
    AcceptDeclineInvitationResponseSchema,
    InvitationParamsSchema,
    ListInvitationsResponseSchema,
    SendInvitationBodySchema,
    SendInvitationResponseSchema,
    SurveyWalkInvitationParamsSchema,
} from '../schemas/invitation.schema';
import { FastifyReplyTypeBox, FastifyRequestTypeBox } from '../types/fastify';

// Schema definitions used by Fastify for request validation and response serialization
const SendInvitationSchema = {
    params: SurveyWalkInvitationParamsSchema,
    body: SendInvitationBodySchema,
    response: { 201: SendInvitationResponseSchema },
};

const ListInvitationsForWalkSchema = {
    params: SurveyWalkInvitationParamsSchema,
    response: { 200: ListInvitationsResponseSchema },
};

const ListMyInvitationsSchema = {
    response: { 200: ListInvitationsResponseSchema },
};

const AcceptDeclineSchema = {
    params: InvitationParamsSchema,
    response: { 200: AcceptDeclineInvitationResponseSchema },
};

// Converts InvitationEntity (internal DB format) to the API response format
// - adds empty surveyWalkName and inviterName as placeholders (enriched separately where needed)
// - converts Date to ISO string for JSON serialization
function toDto(invitation: InvitationEntity) {
    return {
        uid: invitation.uid,
        surveyWalkUid: invitation.surveyWalkUid,
        surveyWalkName: '',
        inviterUid: invitation.inviterUid,
        inviterName: '',
        inviteeEmail: invitation.inviteeEmail,
        type: invitation.type,
        proposedLeaderUid: invitation.proposedLeaderUid,
        status: invitation.status,
        createdAt: invitation.createdAt.toISOString(),
    };
}

// POST /api/surveyWalks/:uid/invitations
// Send an invitation email to the given inviteeEmail for the specified survey walk
export async function sendInvitationHandler(
    request: FastifyRequestTypeBox<typeof SendInvitationSchema>,
    reply: FastifyReplyTypeBox<typeof SendInvitationSchema>,
) {
    if (!request.user) throw new Error('User not found in request');

    const { invitationService } = getContainer();
    const invitation = await invitationService.sendInvitation(
        request.params.uid,
        request.user.uid,
        request.body.inviteeEmail,
    );

    return reply.code(201).send({
        success: true,
        invitation: toDto(invitation),
    });
}

// GET /api/surveyWalks/:uid/invitations
// List all invitations sent for a specific survey walk
export async function listInvitationsForWalkHandler(
    request: FastifyRequestTypeBox<typeof ListInvitationsForWalkSchema>,
    _reply: FastifyReplyTypeBox<typeof ListInvitationsForWalkSchema>,
) {
    const { invitationService } = getContainer();
    const invitations = await invitationService.getInvitationsForWalk(request.params.uid);
    return { invitations: invitations.map(toDto) };
}

// GET /api/invitations/mine
// List all pending invitations for the currently logged-in user
// Enriches each invitation with walk name and inviter name for display on Dashboard
export async function listMyInvitationsHandler(
    request: FastifyRequestTypeBox<typeof ListMyInvitationsSchema>,
    _reply: FastifyReplyTypeBox<typeof ListMyInvitationsSchema>,
) {
    if (!request.user) throw new Error('User not found in request');
    if (!request.user.email) throw new Error('User email not found in request');

    const { invitationService, surveyWalkRepository } = getContainer();
    const invitations = await invitationService.getMyInvitations(request.user.email);

    // Enrich each invitation with walk name and inviter display name
    const enriched = await Promise.all(
        invitations.map(async (inv: InvitationEntity) => {
            const dto = toDto(inv);
            try {
                const walk = await surveyWalkRepository.findById(inv.surveyWalkUid);
                const inviter = await auth.getUser(inv.inviterUid);
                return {
                    ...dto,
                    surveyWalkName: walk?.name ?? 'Unknown walk',
                    inviterName: inviter.displayName || inviter.email || 'A volunteer',
                };
            } catch {
                // If enrichment fails, return with placeholder values rather than failing the whole request
                return { ...dto, surveyWalkName: 'Unknown walk', inviterName: 'A volunteer' };
            }
        })
    );

    return { invitations: enriched };
}

// POST /api/invitations/:uid/accept
// Accept an invitation - verifies the invitation belongs to the current user then joins the walk
export async function acceptInvitationHandler(
    request: FastifyRequestTypeBox<typeof AcceptDeclineSchema>,
    _reply: FastifyReplyTypeBox<typeof AcceptDeclineSchema>,
) {
    if (!request.user) throw new Error('User not found in request');
    if (!request.user.email) throw new Error('User email not found in request');

    const { invitationService } = getContainer();
    const invitation = await invitationService.acceptInvitation(
        request.params.uid,
        request.user.uid,
        request.user.email,
    );

    return { success: true, invitation: toDto(invitation) };
}

// POST /api/invitations/:uid/decline
// Decline an invitation - verifies the invitation belongs to the current user
export async function declineInvitationHandler(
    request: FastifyRequestTypeBox<typeof AcceptDeclineSchema>,
    _reply: FastifyReplyTypeBox<typeof AcceptDeclineSchema>,
) {
    if (!request.user) throw new Error('User not found in request');
    if (!request.user.email) throw new Error('User email not found in request');

    const { invitationService } = getContainer();
    const invitation = await invitationService.declineInvitation(
        request.params.uid,
        request.user.email,
    );

    return { success: true, invitation: toDto(invitation) };
}
