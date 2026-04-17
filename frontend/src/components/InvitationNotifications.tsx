import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { RafflesGoService } from '@/api';

type Invitation = Awaited<ReturnType<typeof RafflesGoService.listMyInvitations>>['invitations'][number] & {
    type?: 'walk_invitation' | 'leader_invitation';
};

const sectionStyle: CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '1.5rem',
    marginTop: '1.5rem',
};

const cardStyle: CSSProperties = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    padding: '1rem 1.25rem',
    marginTop: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.75rem',
};

type InvitationNotificationsProps = {
    userEmail: string | null;
};

export default function InvitationNotifications({ userEmail }: InvitationNotificationsProps) {
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [error, setError] = useState(false);

    const fetchInvitations = async () => {
        if (!userEmail) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const response = await RafflesGoService.listMyInvitations();
            setInvitations(response.invitations);
        } catch {
            setError(true);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void fetchInvitations();
    }, [userEmail]);

    const handleAccept = async (invitationUid: string) => {
        try {
            setActionLoadingId(invitationUid);
            await RafflesGoService.acceptInvitation(invitationUid);
            // Remove accepted invitation from list
            setInvitations((prev) => prev.filter((inv) => inv.uid !== invitationUid));
        } catch {
            alert('Failed to accept invitation. Please try again.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDecline = async (invitationUid: string) => {
        try {
            setActionLoadingId(invitationUid);
            await RafflesGoService.declineInvitation(invitationUid);
            // Remove declined invitation from list
            setInvitations((prev) => prev.filter((inv) => inv.uid !== invitationUid));
        } catch {
            alert('Failed to decline invitation. Please try again.');
        } finally {
            setActionLoadingId(null);
        }
    };

    // Don't render the section if there are no pending invitations or while loading.
    if (isLoading || (!error && invitations.length === 0)) return null;

    return (
        <section style={sectionStyle}>
            <h2>
                Pending Invitations
                {invitations.length > 0 && (
                    <span style={{
                        marginLeft: '0.5rem',
                        background: '#e53e3e',
                        color: 'white',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        padding: '0.15rem 0.55rem',
                        verticalAlign: 'middle',
                    }}>
                        {invitations.length}
                    </span>
                )}
            </h2>

            {error && <p className="text-error">Could not load invitations right now.</p>}

            {invitations.map((inv) => (
                <div key={inv.uid} style={cardStyle}>
                    <div>
                        <strong>{inv.surveyWalkName || 'A survey walk'}</strong>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {inv.type === 'leader_invitation'
                                ? `Leadership invitation from ${inv.inviterName || 'a volunteer'}`
                                : `Invited by ${inv.inviterName || 'a volunteer'}`}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            className="btn btn-primary"
                            onClick={() => handleAccept(inv.uid)}
                            disabled={actionLoadingId === inv.uid}
                        >
                            {actionLoadingId === inv.uid ? 'Processing...' : 'Accept'}
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => handleDecline(inv.uid)}
                            disabled={actionLoadingId === inv.uid}
                        >
                            Decline
                        </button>
                    </div>
                </div>
            ))}
        </section>
    );
}
