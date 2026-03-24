export type SightingResult = 'sighted' | 'not_sighted';

export type DraftStatus = 'draft' | 'pending_sync' | 'syncing' | 'submitted' | 'failed';

export interface SightingDraftFormData {
  result: SightingResult | null;
  date: string;
  time: string;
  location: string;

  species: string;
  latitude: number | null;
  longitude: number | null;
  adults: number | null;
  juveniles: number | null;
  behaviour: string;
  notes: string;

  // backend uses mediaUrl after upload,
  // but draft uses local files before upload
  mediaUrl: string;
}

export interface DraftMedia {
  id: string;
  name: string;
  type: string;
  blob: Blob;
}

export interface SightingDraft {
  id: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  status: DraftStatus;

  formData: SightingDraftFormData;
  media: DraftMedia[];

  lastError?: string | null;
}