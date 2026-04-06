import 'fake-indexeddb/auto';
import { indexedDB as fakeIndexedDB, IDBKeyRange } from 'fake-indexeddb';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SightingDraft } from '../types/sightingDrafts';

// Force IndexedDB globals
Object.defineProperty(globalThis, 'indexedDB', {
  value: fakeIndexedDB,
  writable: true,
});

Object.defineProperty(globalThis, 'IDBKeyRange', {
  value: IDBKeyRange,
  writable: true,
});

function makeDraft(overrides: Partial<SightingDraft> = {}): SightingDraft {
  const now = Date.now();

  const base: SightingDraft = {
    id: 'draft-1',
    userId: 'user-123',
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    formData: {
      result: 'sighted',
      surveyWalkUid: 'walk-1',
      date: '2026-03-27',
      time: '09:00',
      location: 'Thomson Nature Park Route A',
      species: "Raffles' Banded Langur",
      latitude: 1.35,
      longitude: 103.8,
      adults: 2,
      juveniles: 1,
      behaviour: 'Feeding',
      notes: 'Near trail',
      mediaUrl: '',
    },
    media: [],
    lastError: null,
  };

  return {
    ...base,
    ...overrides,
    formData: {
      ...base.formData,
      ...overrides.formData,
    },
  };
}

async function loadStorageModule() {
  return import('../services/SightingDraftsService');
}

describe('draftStorage', () => {
  beforeEach(async () => {
    const storage = await loadStorageModule();
    await storage.__clearDraftsForTests();
  });

  afterEach(async () => {
    const storage = await loadStorageModule();
    await storage.__resetDraftDbForTests();
    vi.restoreAllMocks();
  });

  it('saveDraft stores a draft and getDraft retrieves it', async () => {
    const { saveDraft, getDraft } = await loadStorageModule();

    const draft = makeDraft();

    await saveDraft(draft);
    const result = await getDraft('draft-1');

    expect(result).toEqual(draft);
  });

  it('getDraft returns undefined for a missing draft', async () => {
    const { getDraft } = await loadStorageModule();

    const result = await getDraft('missing-id');

    expect(result).toBeUndefined();
  });

  it('getAllDrafts returns all saved drafts', async () => {
    const { saveDraft, getAllDrafts } = await loadStorageModule();

    const draft1 = makeDraft({ id: 'draft-1' });
    const draft2 = makeDraft({
      id: 'draft-2',
      status: 'submitted',
      formData: {
        result: 'not_sighted',
        surveyWalkUid: 'walk-2',
        date: '2026-03-27',
        time: '09:00',
        location: 'Springleaf Route C',
        species: '',
        latitude: null,
        longitude: null,
        adults: null,
        juveniles: null,
        behaviour: '',
        notes: 'Raining',
        mediaUrl: '',
      },
    });

    await saveDraft(draft1);
    await saveDraft(draft2);

    const drafts = await getAllDrafts();

    expect(drafts).toHaveLength(2);
    expect(drafts).toEqual(expect.arrayContaining([draft1, draft2]));
  });

  it('deleteDraft removes the specified draft only', async () => {
    const { saveDraft, getAllDrafts, getDraft, deleteDraft } =
      await loadStorageModule();

    const draft1 = makeDraft({ id: 'draft-1' });
    const draft2 = makeDraft({ id: 'draft-2' });

    await saveDraft(draft1);
    await saveDraft(draft2);

    await deleteDraft('draft-1');

    const deleted = await getDraft('draft-1');
    const remaining = await getDraft('draft-2');
    const allDrafts = await getAllDrafts();

    expect(deleted).toBeUndefined();
    expect(remaining).toEqual(draft2);
    expect(allDrafts).toHaveLength(1);
    expect(allDrafts[0]).toEqual(draft2);
  });

  it('updateDraftStatus updates status, updatedAt, and lastError', async () => {
    const { saveDraft, getDraft, updateDraftStatus } =
      await loadStorageModule();

    const originalTime = 1000;
    const updatedTime = 2000;

    vi.spyOn(Date, 'now').mockReturnValue(updatedTime);

    const draft = makeDraft({
      createdAt: originalTime,
      updatedAt: originalTime,
      status: 'draft',
      lastError: null,
    });

    await saveDraft(draft);
    await updateDraftStatus('draft-1', 'failed', 'Upload failed');

    const updated = await getDraft('draft-1');

    expect(updated).toMatchObject({
      id: 'draft-1',
      status: 'failed',
      lastError: 'Upload failed',
      createdAt: originalTime,
      updatedAt: updatedTime,
    });
  });

  it('updateDraftStatus sets lastError to null when omitted', async () => {
    const { saveDraft, getDraft, updateDraftStatus } =
      await loadStorageModule();

    vi.spyOn(Date, 'now').mockReturnValue(3000);

    const draft = makeDraft({
      lastError: 'Old error',
    });

    await saveDraft(draft);
    await updateDraftStatus('draft-1', 'submitted');

    const updated = await getDraft('draft-1');

    expect(updated).toMatchObject({
      status: 'submitted',
      lastError: null,
      updatedAt: 3000,
    });
  });

  it('updateDraftStatus throws when the draft does not exist', async () => {
    const { updateDraftStatus } = await loadStorageModule();

    await expect(
      updateDraftStatus('missing-id', 'failed', 'Some error')
    ).rejects.toThrow('Draft missing-id not found');
  });

  it('getDraftsByStatus returns only drafts with the matching status', async () => {
    const { saveDraft, getDraftsByStatus } = await loadStorageModule();

    const draft1 = makeDraft({ id: 'draft-1', status: 'draft' });
    const draft2 = makeDraft({ id: 'draft-2', status: 'failed' });
    const draft3 = makeDraft({ id: 'draft-3', status: 'draft' });

    await saveDraft(draft1);
    await saveDraft(draft2);
    await saveDraft(draft3);

    const drafts = await getDraftsByStatus('draft');

    expect(drafts).toHaveLength(2);
    expect(drafts).toEqual(expect.arrayContaining([draft1, draft3]));
    expect(drafts).not.toEqual(expect.arrayContaining([draft2]));
  });
});