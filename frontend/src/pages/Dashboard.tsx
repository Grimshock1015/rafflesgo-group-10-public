import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { RafflesGoService } from '../api';
import { Link } from 'react-router-dom';

export default function Dashboard({ user }: { user: User }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);

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
              {/* Add your feature links here */}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
