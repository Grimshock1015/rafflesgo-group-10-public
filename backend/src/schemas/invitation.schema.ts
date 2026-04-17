import { Type, Static } from '@sinclair/typebox';

export const invitationSchema = Type.Object({
    uid: Type.String(),
    surveyWalkUid: Type.String(),
    surveyWalkName: Type.String(),
    inviterUid: Type.String(),
    inviterName: Type.String(),
    inviteeEmail: Type.String({ format: 'email' }),
    type: Type.Union([
        Type.Literal('walk_invitation'),
        Type.Literal('leader_invitation'),
    ]),
    proposedLeaderUid: Type.Optional(Type.String()),
    status: Type.Union([
        Type.Literal('pending'),
        Type.Literal('accepted'),
        Type.Literal('declined'),
    ]),
    createdAt: Type.String({ format: 'date-time' }),
});

export const InvitationParamsSchema = Type.Object({
    uid: Type.String(),
});

export const SurveyWalkInvitationParamsSchema = Type.Object({
    uid: Type.String(), // surveyWalkUid
});

export const SendInvitationBodySchema = Type.Object({
    inviteeEmail: Type.String({ format: 'email' }),
});

export const SendInvitationResponseSchema = Type.Object({
    success: Type.Boolean(),
    invitation: invitationSchema,
});

export const ListInvitationsResponseSchema = Type.Object({
    invitations: Type.Array(invitationSchema),
});

export const AcceptDeclineInvitationResponseSchema = Type.Object({
    success: Type.Boolean(),
    invitation: invitationSchema,
});

export type Invitation = Static<typeof invitationSchema>;
export type InvitationParams = Static<typeof InvitationParamsSchema>;
export type SurveyWalkInvitationParams = Static<typeof SurveyWalkInvitationParamsSchema>;
export type SendInvitationBody = Static<typeof SendInvitationBodySchema>;
export type SendInvitationResponse = Static<typeof SendInvitationResponseSchema>;
export type ListInvitationsResponse = Static<typeof ListInvitationsResponseSchema>;
export type AcceptDeclineInvitationResponse = Static<typeof AcceptDeclineInvitationResponseSchema>;
