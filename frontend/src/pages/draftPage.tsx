import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import { Navigation } from '../components/Navigation';
import { getAllDrafts, deleteDraft } from '../services/SightingDraftsService';
import type { SightingDraft } from '../types/sightingDrafts';
import type { User } from 'firebase/auth';

export default function DraftsPage({ user }: { user: User }) {
  const [drafts, setDrafts] = useState<SightingDraft[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const allDrafts = await getAllDrafts();
      const userDrafts = allDrafts
        .filter((d: SightingDraft) => d.userId === user.uid)
        .sort((a: SightingDraft, b: SightingDraft) => b.updatedAt - a.updatedAt);

      if (!cancelled) {
        setDrafts(userDrafts);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [user.uid]);

  const handleDelete = async (id: string) => {
    await deleteDraft(id);

    const allDrafts = await getAllDrafts();
    const userDrafts = allDrafts
      .filter((d: SightingDraft) => d.userId === user.uid)
      .sort((a: SightingDraft, b: SightingDraft) => b.updatedAt - a.updatedAt);

    setDrafts(userDrafts);
  };

  const handleOpen = (id: string) => {
    navigate(`/submit-sighting?draftId=${id}`);
  };

  return (
    <>
      {/* <Navigation user={user} /> */}

      <main style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
        <h1>Saved Drafts</h1>

        {drafts.length === 0 ? (
          <p>No drafts yet.</p>
        ) : (
          drafts.map((draft) => (
            <div
              key={draft.id}
              style={{
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem',
              }}
            >
              <p><strong>{draft.formData.location || 'No location'}</strong></p>
              <p>{draft.formData.date} {draft.formData.time}</p>
              <p style={{ fontSize: '0.85rem', color: '#666' }}>
                Last updated: {new Date(draft.updatedAt).toLocaleString()}
              </p>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button onClick={() => handleOpen(draft.id)}>
                  Open
                </button>

                <button
                  onClick={() => handleDelete(draft.id)}
                  style={{ color: 'red' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </main>
    </>
  );
}