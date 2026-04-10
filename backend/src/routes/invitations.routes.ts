import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { verifyToken } from '../middleware/auth.middleware';
import {
    AcceptDeclineInvitationResponseSchema,
    InvitationParamsSchema,
    ListInvitationsResponseSchema,
    SendInvitationBodySchema,
    SendInvitationResponseSchema,
    SurveyWalkInvitationParamsSchema,
} from '../schemas/invitation.schema';
import {
    acceptInvitationHandler,
    declineInvitationHandler,
    listInvitationsForWalkHandler,
    listMyInvitationsHandler,
    sendInvitationHandler,
} from '../handlers/invitation.handler';

export const invitationRoutes: FastifyPluginAsyncTypebox = async (fastify) => {

    // POST /api/surveyWalks/:uid/invitations
    // Any logged-in user can send an invitation for a survey walk
    fastify.post('/api/surveyWalks/:uid/invitations', {
        preHandler: [verifyToken],
        schema: {
            operationId: 'sendInvitation',
            description: 'Send an invitation email to a volunteer for a survey walk',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            params: SurveyWalkInvitationParamsSchema,
            body: SendInvitationBodySchema,
            response: { 201: SendInvitationResponseSchema },
        },
    }, sendInvitationHandler);

    // GET /api/surveyWalks/:uid/invitations
    // Any logged-in user can view the invitation list for a survey walk
    fastify.get('/api/surveyWalks/:uid/invitations', {
        preHandler: [verifyToken],
        schema: {
            operationId: 'listInvitationsForWalk',
            description: 'List all invitations for a specific survey walk',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            params: SurveyWalkInvitationParamsSchema,
            response: { 200: ListInvitationsResponseSchema },
        },
    }, listInvitationsForWalkHandler);

    // GET /api/invitations/mine
    // Returns all pending invitations for the currently logged-in user
    fastify.get('/api/invitations/mine', {
        preHandler: [verifyToken],
        schema: {
            operationId: 'listMyInvitations',
            description: 'List all pending invitations for the current user',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            response: { 200: ListInvitationsResponseSchema },
        },
    }, listMyInvitationsHandler);

    // POST /api/invitations/:uid/accept
    // Accept an invitation - only the invitee can accept
    fastify.post('/api/invitations/:uid/accept', {
        preHandler: [verifyToken],
        schema: {
            operationId: 'acceptInvitation',
            description: 'Accept a pending invitation and join the survey walk',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            params: InvitationParamsSchema,
            response: { 200: AcceptDeclineInvitationResponseSchema },
        },
    }, acceptInvitationHandler);

    // POST /api/invitations/:uid/decline
    // Decline an invitation - only the invitee can decline
    fastify.post('/api/invitations/:uid/decline', {
        preHandler: [verifyToken],
        schema: {
            operationId: 'declineInvitation',
            description: 'Decline a pending invitation',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            params: InvitationParamsSchema,
            response: { 200: AcceptDeclineInvitationResponseSchema },
        },
    }, declineInvitationHandler);
};