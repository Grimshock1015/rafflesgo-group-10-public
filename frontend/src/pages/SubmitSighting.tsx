import { useState, useRef, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { Navigation } from '../components/Navigation';
import { SightingsService, OpenAPI } from '../api';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import exifr from 'exifr';

// Fix leaflet icon issue in react-leaflet
interface DefaultIcon extends L.Icon.Default {
  _getIconUrl?: string;
}
delete (L.Icon.Default.prototype as DefaultIcon)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition }: { position: L.LatLng | null, setPosition: (p: L.LatLng) => void }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  return position === null ? null : <Marker position={position}></Marker>;
}

const SPECIES_OPTIONS = ["Raffles' Banded Langur", "Macaque", "Wild Boar", "Other"];
// Mocked routes based on SRS survey walks (Replace with actual data fetch)
const ROUTE_OPTIONS = ["Thomson Nature Park Route A", "Old Upper Thomson Route B", "Springleaf Route C"];

const isPrimate = (species: string) => species === "Raffles' Banded Langur" || species === "Macaque";

export default function SubmitSightingPage({ user }: { user: User }) {
  const [result, setResult] = useState<'sighted' | 'not_sighted'>('sighted');

  // Basic Walk Info
  const [route, setRoute] = useState(ROUTE_OPTIONS[0]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');

  // Sighting Specific Info
  const [speciesSelect, setSpeciesSelect] = useState(SPECIES_OPTIONS[0]);
  const [otherSpecies, setOtherSpecies] = useState('');
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [adults, setAdults] = useState<number | ''>('');
  const [juveniles, setJuveniles] = useState<number | ''>('');
  const [behaviour, setBehaviour] = useState('');

  // Multiple Media State
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);
    setMediaFiles(prev => [...prev, ...newFiles]);

    // Try to extract GPS from the first newly added image that has it
    for (const file of newFiles) {
      if (file.type.startsWith('image/')) {
        try {
          const gps = await exifr.gps(file);
          if (gps && gps.latitude && gps.longitude) {
            setPosition(new L.LatLng(gps.latitude, gps.longitude));
            break; // Stop after finding the first valid GPS coordinate
          }
        } catch {
          console.log(`No GPS data in ${file.name}`);
        }
      }
    }

    // Clear input so same files can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (indexToRemove: number) => {
    setMediaFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const token = await user.getIdToken();
      OpenAPI.HEADERS = { Authorization: `Bearer ${token}` };

      let mediaUrls: string[] = [];

      // Upload multiple files concurrently if sighted
      if (result === 'sighted' && mediaFiles.length > 0) {
        const uploadPromises = mediaFiles.map(async (file) => {
          const storageRef = ref(storage, `sightings/${user.uid}/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          return getDownloadURL(storageRef);
        });
        mediaUrls = await Promise.all(uploadPromises);
      }

      const finalSpecies = speciesSelect === 'Other' ? otherSpecies : speciesSelect;

      // Call API
      await SightingsService.postApiSightings({
        result,
        location: route, // Backend expects 'location'
        date,
        time,
        notes: notes || undefined,
        ...(result === 'sighted' && {
          species: finalSpecies,
          latitude: position?.lat,
          longitude: position?.lng,
          adults: typeof adults === 'number' ? adults : undefined,
          juveniles: typeof juveniles === 'number' ? juveniles : undefined,
          behaviour: behaviour || undefined,
          mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined, // Array of URLs
        })
      });

      setMessage('Observation submitted successfully!');

      // Reset form
      setResult('sighted');
      setDate('');
      setTime('');
      setNotes('');
      setSpeciesSelect(SPECIES_OPTIONS[0]);
      setOtherSpecies('');
      setPosition(null);
      setAdults('');
      setJuveniles('');
      setBehaviour('');
      setMediaFiles([]);
    } catch (error) {
      console.error('Failed to submit sighting:', error);
      setMessage('Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navigation user={user} />

      <main className="main-content" style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
        <header className="welcome-header" style={{ marginBottom: '2rem' }}>
          <h1>Log an Observation</h1>
          <p className="welcome-subtitle">What did you see on a walk?</p>
        </header>

        <form onSubmit={handleSubmit}>

          {/* SECTION 1: OBSERVATION TYPE */}
          <div className="card section-container" style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h3>Did you see anything?</h3>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                style={{ flex: 1, padding: '1rem', backgroundColor: result === 'sighted' ? '#2f855a' : '#edf2f7', color: result === 'sighted' ? 'white' : 'black', borderRadius: '6px', border: 'none' }}
                onClick={() => setResult('sighted')}
              >
                🐒 Animal Sighted
              </button>
              <button
                type="button"
                style={{ flex: 1, padding: '1rem', backgroundColor: result === 'not_sighted' ? '#c53030' : '#edf2f7', color: result === 'not_sighted' ? 'white' : 'black', borderRadius: '6px', border: 'none' }}
                onClick={() => setResult('not_sighted')}
              >
                ❌ No Sighting
              </button>
            </div>
          </div>

          {/* SECTION 2: BASIC WALK INFO (Applies to both) */}
          <div className="card section-container" style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h3>Walk Details</h3>
            <div style={{ marginBottom: '1rem', marginTop: '0.5rem' }}>
              <label htmlFor="route">Survey Route</label>
              <select id="route" value={route} onChange={(e) => setRoute(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px' }}>
                {ROUTE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label htmlFor="date">Date</label>
                <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div>
                <label htmlFor="time">Time</label>
                <input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
            </div>
          </div>

          {/* ONLY RENDER THESE SECTIONS IF AN ANIMAL WAS SIGHTED */}
          {result === 'sighted' && (
            <>
              {/* SECTION 3: MEDIA UPLOAD (Plural) */}
              <div className="card section-container" style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
                <h3>Photos / Videos</h3>
                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>Select files. Location information will be added automatically when available.</p>
                <input
                  id="mediaFiles"
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  style={{ marginBottom: '1rem' }}
                />

                {mediaFiles.length > 0 && (
                  <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                    {mediaFiles.map((file, idx) => (
                      <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#f7fafc', marginBottom: '0.25rem', borderRadius: '4px' }}>
                        <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                        <button type="button" onClick={() => removeFile(idx)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>X</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* SECTION 4: ANIMAL DETAILS */}
              <div className="card section-container" style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
                <h3>Animal Details</h3>
                <div style={{ marginBottom: '1rem' }}>
                  <label htmlFor="species">Species</label>
                  <select id="species" value={speciesSelect} onChange={(e) => setSpeciesSelect(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px' }}>
                    {SPECIES_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                {speciesSelect === 'Other' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label htmlFor="otherSpecies">Specify Other Species</label>
                    <input id="otherSpecies" type="text" value={otherSpecies} onChange={(e) => setOtherSpecies(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                  </div>
                )}

                {isPrimate(speciesSelect) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label htmlFor="adults">Adults</label>
                      <input id="adults" type="number" min="0" placeholder={"2"} value={adults} onChange={(e) => setAdults(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                    <div>
                      <label htmlFor="juveniles">Juveniles</label>
                      <input id="juveniles" type="number" min="0" placeholder={"1"} value={juveniles} onChange={(e) => setJuveniles(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label htmlFor="behaviour">Behaviour</label>
                      <textarea id="behaviour" value={behaviour} onChange={(e) => setBehaviour(e.target.value)} placeholder="e.g., Feeding, resting..." style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 5: MAP (Only for Sightings) */}
              <div className="card section-container" style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3>Pinpoint Location</h3>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.geolocation.getCurrentPosition((pos) => {
                        setPosition(new L.LatLng(pos.coords.latitude, pos.coords.longitude));
                      });
                    }}
                    style={{ padding: '0.5rem', fontSize: '0.85rem', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    📍 Use Device GPS
                  </button>
                </div>
                <div style={{ height: '250px', width: '100%', zIndex: 0, position: 'relative' }}>
                  <MapContainer center={[1.3521, 103.8198]} zoom={11} style={{ height: '100%', width: '100%', zIndex: 0, borderRadius: '4px' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationMarker position={position} setPosition={setPosition} />
                  </MapContainer>
                </div>
                {position && <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>Pinned: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}</p>}
              </div>
            </>
          )}

          {/* SECTION 6: NOTES */}
          <div className="card section-container" style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h3>Additional Notes</h3>
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={result === 'not_sighted' ? "Any trail blockages, bad weather etc?" : "Any other details?"} style={{ width: '100%', padding: '0.75rem', minHeight: '80px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>

          <button type="submit" className="btn-primary" disabled={submitting} style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: 'bold', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>

          {message && <p style={{ textAlign: 'center', marginTop: '1rem', color: '#2f855a', fontWeight: 'bold' }}>{message}</p>}
        </form>
      </main>
    </>
  );
}