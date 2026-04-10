import type { RafflesGoService } from '../api';
import type { listAllAdminSightings } from '../lib/adminSightings';
import * as XLSX from 'xlsx';

type AdminUser = Awaited<ReturnType<typeof RafflesGoService.listUsers>>['users'][number];
type AdminSighting = Awaited<ReturnType<typeof listAllAdminSightings>>['sightings'][number];
type SurveyPeriod = Awaited<ReturnType<typeof RafflesGoService.listSurveyPeriods>>['surveyPeriods'][number] & {
  volunteerUids?: string[];
};
type SurveyWalk = Awaited<ReturnType<typeof RafflesGoService.listSurveyWalks>>['surveyWalks'][number];

type ExportPayload = {
  users: AdminUser[];
  surveyPeriods: SurveyPeriod[];
  surveyWalks: SurveyWalk[];
  sightings: AdminSighting[];
};

function toIsoTimestamp(value = new Date()) {
  return value.toISOString();
}

function toFileTimestamp(value = new Date()) {
  return value.toISOString().replace(/[:.]/g, '-');
}

function joinList(values: string[]) {
  return values.join(', ');
}

export function exportAdminDataToGoogleSheets(payload: ExportPayload) {
  const workbook = XLSX.utils.book_new();
  const exportedAt = toIsoTimestamp();

  const overviewRows = [
    {
      exportedAt,
      usersCount: payload.users.length,
      surveyPeriodsCount: payload.surveyPeriods.length,
      surveyWalksCount: payload.surveyWalks.length,
      sightingsCount: payload.sightings.length,
      notes: 'Import this workbook into Google Sheets to migrate platform data.',
    },
  ];

  const userRows = payload.users.map((user) => ({
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? '',
    role: user.role,
    disabled: user.disabled,
    createdAt: user.createdAt ?? '',
    photoURL: user.photoURL ?? '',
  }));

  const surveyPeriodRows = payload.surveyPeriods.map((surveyPeriod) => {
    const volunteerUids = surveyPeriod.volunteerUids ?? [];

    return {
      uid: surveyPeriod.uid,
      name: surveyPeriod.name,
      startDate: surveyPeriod.startDate,
      endDate: surveyPeriod.endDate,
      isFinished: surveyPeriod.isFinished,
      minWalks: surveyPeriod.minWalks,
      volunteerCount: volunteerUids.length,
      volunteerUids: joinList(volunteerUids),
    };
  });

  const surveyWalkRows = payload.surveyWalks.map((surveyWalk) => ({
    uid: surveyWalk.uid,
    surveyPeriodUid: surveyWalk.surveyPeriodUid,
    surveyPeriodName: surveyWalk.surveyPeriodName,
    name: surveyWalk.name,
    date: surveyWalk.date,
    startTime: surveyWalk.startTime,
    endTime: surveyWalk.endTime,
    capacity: surveyWalk.capacity,
    isFinished: surveyWalk.isFinished,
    completedAt: surveyWalk.completedAt ?? '',
    leaderUid: surveyWalk.leader.uid,
    leaderName: surveyWalk.leader.name,
    volunteerCount: surveyWalk.volunteers.length,
    attendeeCount: surveyWalk.attendees.length,
    noShowCount: surveyWalk.noShows.length,
    volunteerUids: joinList(surveyWalk.volunteers.map((volunteer) => volunteer.uid)),
    volunteerNames: joinList(surveyWalk.volunteers.map((volunteer) => volunteer.name)),
    attendeeUids: joinList(surveyWalk.attendees.map((volunteer) => volunteer.uid)),
    attendeeNames: joinList(surveyWalk.attendees.map((volunteer) => volunteer.name)),
    noShowUids: joinList(surveyWalk.noShows.map((volunteer) => volunteer.uid)),
    noShowNames: joinList(surveyWalk.noShows.map((volunteer) => volunteer.name)),
  }));

  const sightingRows = payload.sightings.map((sighting) => ({
    id: sighting.id,
    surveyWalkUid: sighting.surveyWalkUid,
    result: sighting.result,
    date: sighting.date,
    time: sighting.time,
    location: sighting.location,
    species: sighting.species ?? '',
    latitude: sighting.latitude ?? '',
    longitude: sighting.longitude ?? '',
    adults: sighting.adults ?? '',
    juveniles: sighting.juveniles ?? '',
    behaviour: sighting.behaviour ?? '',
    notes: sighting.notes ?? '',
    submittedBy: sighting.submittedBy,
    mediaUrl: sighting.mediaUrl ?? '',
    createdAt: sighting.createdAt,
  }));

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(overviewRows), 'Overview');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(userRows), 'Users');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(surveyPeriodRows), 'Survey Periods');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(surveyWalkRows), 'Survey Walks');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sightingRows), 'Sightings');

  XLSX.writeFile(workbook, `rafflesgo-google-sheets-export-${toFileTimestamp()}.xlsx`);
}
