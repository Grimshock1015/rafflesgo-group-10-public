import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { Navigation } from '../components/Navigation';
import { RafflesGoService } from '../api';

export default function Dashboard({ user }: { user: User }) {
  const [helloMessage, setHelloMessage] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const fetchHello = async () => {
      try {
        const response = await RafflesGoService.sayHello(
          user.displayName || 'Volunteer',
        );
        setHelloMessage(response.message);
      } catch (error) {
        console.error('Failed to fetch hello message:', error);
      }
    };

    const fetchEmail = async () => {
      try {
        const response = await RafflesGoService.getCurrentUser();
        console.log(response)
        setUserEmail(response.email);
      } catch (error) {
        console.error('Failed to fetch user email:', error);
      }
    };

    fetchHello();
    fetchEmail();
  }, [user.displayName]);

  return (
    <>
      <Navigation user={user} />

      {/* Main Dashboard Content */}
      <main className="main-content">
        <div className="container">
          <header className="welcome-header">
            <h1>
              Welcome back,{' '}
              <span id="volunteerName">{user.displayName || 'Volunteer'}</span>!
            </h1>
            <p className="welcome-subtitle">
              Langur conservation volunteer platform
            </p>
            {helloMessage && <p className="hello-message">{helloMessage}</p>}
            {userEmail || ""}
          </header>

          <section className="quick-actions">
            <h2>Quick Actions</h2>
            <div className="action-buttons">
              {/* Add your feature links here */}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
