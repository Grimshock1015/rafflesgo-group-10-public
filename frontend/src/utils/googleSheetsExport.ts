import * as XLSX from 'xlsx';

type AdminUser = {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  disabled: boolean;
  createdAt?: string;
  role: 'user' | 'admin';
};

type AdminSighting = {
  id: string;
  surveyWalkUid: string;
  result: string;
  date: string;
  time: string;
  location: string;
  species?: string;
  latitude?: number;
  longitude?: number;
  adults?: number;
  juveniles?: number;
  behaviour?: string;
  notes: string;
  submittedBy: string;
  mediaUrl?: string;
  createdAt: string;
};

type SurveyPeriod = {
  uid: string;
  name: string;
  startDate: string;
  endDate: string;
  isFinished: boolean;
  minWalks: number;
  volunteerUids: string[];
};

type SurveyWalk = {
  uid: string;
  surveyPeriodUid: string;
  surveyPeriodName: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  isFinished: boolean;
  volunteers: Array<{
    uid: string;
    name: string;
  }>;
  leader: {
    uid: string;
    name: string;
  };
};

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

  const surveyPeriodRows = payload.surveyPeriods.map((surveyPeriod) => ({
    uid: surveyPeriod.uid,
    name: surveyPeriod.name,
    startDate: surveyPeriod.startDate,
    endDate: surveyPeriod.endDate,
    isFinished: surveyPeriod.isFinished,
    minWalks: surveyPeriod.minWalks,
    volunteerCount: surveyPeriod.volunteerUids.length,
    volunteerUids: joinList(surveyPeriod.volunteerUids),
  }));

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
    leaderUid: surveyWalk.leader.uid,
    leaderName: surveyWalk.leader.name,
    volunteerCount: surveyWalk.volunteers.length,
    volunteerUids: joinList(surveyWalk.volunteers.map((volunteer) => volunteer.uid)),
    volunteerNames: joinList(surveyWalk.volunteers.map((volunteer) => volunteer.name)),
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
