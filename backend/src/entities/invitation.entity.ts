export interface InvitationEntity {
    uid: string;
    surveyWalkUid: string;
    inviterUid: string;
    inviteeEmail: string;
    type: 'walk_invitation' | 'leader_invitation';
    proposedLeaderUid?: string;
    status: 'pending' | 'accepted' | 'declined';
    createdAt: Date;
}
