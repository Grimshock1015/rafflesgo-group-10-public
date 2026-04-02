import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { RafflesGoService } from '../api';
import { Link } from 'react-router-dom';
import { getAllDrafts } from '../services/SightingDraftsService';

export default function Dashboard({ user }: { user: User }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [draftCount, setDraftCount] = useState(0);

  useEffect(() => {
    const fetchEmail = async () => {
      try {
        const response = await RafflesGoService.getCurrentUser();
        console.log(response)
        setUserEmail(response.email || "");
        setUserRole(response.role || "");
      } catch (error) {
        console.error('Failed to fetch user email:', error);
        setError(true)
      }
    };

    fetchEmail();
  }, [user.displayName]);

  useEffect(() => {
    const loadDraftCount = async () => {
      try {
        const drafts = await getAllDrafts();
        setDraftCount(drafts.filter((draft) => draft.userId === user.uid).length);
      } catch (draftError) {
        console.error('Failed to load draft count:', draftError);
      }
    };

    void loadDraftCount();
  }, [user.uid]);

  const displayRole =
    userRole === "user"
      ? "Volunteer"
      : userRole === "admin"
      ? "Admin"
      : userRole;

  return (
    <>

      {/* Main Dashboard Content */}
      <main className="main-content">
        <div className="container">
          <header className="welcome-header">
            <h1>
              {displayRole && user.displayName && <><span>Welcome back </span> <span id="volunteerName">{user.displayName}</span></>}
            </h1>
            {userEmail || ""}
            <p className={"text-error"}>{error && "Something went wrong getting your details. Please try again later."}</p>

          </header>

          <section className="quick-actions">
            <h2>Quick Actions</h2>
            <div className="action-buttons">
              <Link to="/submit-sighting" className="btn btn-primary">
                Submit Sighting
              </Link>
              <Link to="/drafts" className="btn btn-secondary">
                Saved Drafts {draftCount > 0 ? `(${draftCount})` : ''}
              </Link>
            </div>
            <p className="text-secondary" style={{ marginTop: '0.75rem' }}>
              {draftCount > 0
                ? `You have ${draftCount} saved draft${draftCount === 1 ? '' : 's'} ready to reopen.`
                : 'Saved drafts will appear here after you use Save Draft on a sighting.'}
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
