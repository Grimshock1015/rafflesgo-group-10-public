import { useState, useRef } from 'react';
import type { User } from 'firebase/auth';
import { Navigation } from '../components/Navigation';
import { SightingsService, OpenAPI } from '../api';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase";

export default function SubmitSightingPage({ user }: { user: User }) {
  const [result, setResult] = useState<'sighted' | 'not_sighted'>('sighted');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const token = await user.getIdToken();
      let mediaUrl: string | undefined;

      if (mediaFile) {
        const storageRef = ref(storage, `sightings/${user.uid}/${Date.now()}_${mediaFile.name}`);
        await uploadBytes(storageRef, mediaFile);
        mediaUrl = await getDownloadURL(storageRef);
      }

      OpenAPI.HEADERS = {
        Authorization: `Bearer ${token}`,
      };

      const response = await SightingsService.postApiSightings({
        result,
        date,
        time,
        location,
        notes: notes || undefined,
        mediaUrl,
      });

      console.log(response);
      setMessage(response.message);

      setResult('sighted');
      setDate('');
      setTime('');
      setLocation('');
      setNotes('');
      setMediaFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to submit sighting:', error);
      setMessage('Failed to submit sighting.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navigation user={user} />

      <main className="main-content">
        <div className="container">
          <header className="welcome-header">
            <h1>Submit Sighting</h1>
            <p className="welcome-subtitle">
              Record a langur observation
            </p>
          </header>

          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="result">Result</label>
              <select
                id="result"
                value={result}
                onChange={(e) =>
                  setResult(e.target.value as 'sighted' | 'not_sighted')
                }
              >
                <option value="sighted">Sighted</option>
                <option value="not_sighted">Not Sighted</option>
              </select>
            </div>

            <div>
              <label htmlFor="date">Date</label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="time">Time</label>
              <input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="location">Location</label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter trail or landmark"
                required
              />
            </div>

            <div>
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
              />
            </div>
            
            {result === 'sighted' && (
            <div>
                <label>Photo / Video</label>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                />
            </div>
            )}

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Sighting'}
            </button>

            {message && <p>{message}</p>}
          </form>
        </div>
      </main>
    </>
  );
}