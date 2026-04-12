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

      <main className="main-content">
        <div className="container drafts-page">
          <header className="welcome-header drafts-header">
            <div>
              <h1>Saved Drafts</h1>
              <p className="welcome-subtitle">
                Reopen an unfinished sighting or remove drafts you no longer need.
              </p>
            </div>
            <button className="btn-primary" onClick={() => navigate('/submit-sighting')}>
              New Sighting
            </button>
          </header>

          {/* <section className="card drafts-summary-card">
            <p className="drafts-summary-eyebrow">Local storage</p>
            <h2>{drafts.length} saved draft{drafts.length === 1 ? '' : 's'}</h2>
            <p className="text-secondary">
              Drafts stay on this device and account until you submit or delete them.
            </p>
          </section> */}

          {drafts.length === 0 ? (
            <section className="card drafts-empty-state">
              <h2>No drafts yet</h2>
              <p className="text-secondary">
                Start a sighting, use Save Draft, and it will show up here for later.
              </p>
              <button className="btn-secondary" onClick={() => navigate('/submit-sighting')}>
                Create First Draft
              </button>
            </section>
          ) : (
            <section className="drafts-grid">
              {drafts.map((draft) => (
                <article key={draft.id} className="card draft-card">
                  <div className="draft-card-top">
                    <span className={`draft-pill ${draft.formData.result === 'not_sighted' ? 'zero' : 'sighted'}`}>
                      {draft.formData.result === 'not_sighted' ? 'Zero Sighting' : 'Animal Sighting'}
                    </span>
                    <span className="draft-updated">
                      Updated {new Date(draft.updatedAt).toLocaleString()}
                    </span>
                  </div>

                  <h2>{draft.formData.location || 'No route selected'}</h2>
                  <p className="draft-meta">
                    {draft.formData.date || 'No date'} {draft.formData.time || ''}
                  </p>
                  <p className="draft-meta">
                    {draft.formData.species || (draft.formData.result === 'not_sighted' ? 'No animals recorded' : 'Species not set')}
                  </p>

                  <div className="draft-card-actions">
                    <button className="btn-primary" onClick={() => handleOpen(draft.id)}>
                      Open Draft
                    </button>

                    <button
                      className="btn-secondary"
                      onClick={() => handleDelete(draft.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      </main>
    </>
  );
}
