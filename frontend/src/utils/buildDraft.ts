import type {
  DraftMedia,
  SightingDraft,
  SightingDraftFormData,
} from '../types/sightingDrafts';

interface BuildDraftParams {
  draftId?: string;
  userId: string;
  formData: SightingDraftFormData;
  media: DraftMedia[];
  status?: SightingDraft['status'];
  createdAt?: number;
}

export function buildDraft({
  draftId,
  userId,
  formData,
  media,
  status = 'draft',
  createdAt,
}: BuildDraftParams): SightingDraft {
  const now = Date.now();

  return {
    id: draftId ?? crypto.randomUUID(),
    userId,
    createdAt: createdAt ?? now,
    updatedAt: now,
    status,
    formData,
    media,
    lastError: null,
  };
}