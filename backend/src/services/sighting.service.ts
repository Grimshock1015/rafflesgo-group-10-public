import { randomUUID } from 'crypto';
import { db } from '../lib/firebase-admin';

type CreateSightingInput = {
  result: 'sighted' | 'not_sighted';
  date: string;
  time: string;
  location: string;
  notes?: string;
  mediaUrl?: string;
  submittedBy: string;
};

export async function createSighting(input: CreateSightingInput) {
  const id = randomUUID();

  const sighting = {
    id,
    result: input.result,
    date: input.date,
    time: input.time,
    location: input.location,
    notes: input.notes || '',
    mediaUrl: input.mediaUrl || '',
    submittedBy: input.submittedBy,
    createdAt: new Date().toISOString(),
  };

  await db.collection('sightings').doc(id).set(sighting);

  return sighting;
}