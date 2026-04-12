import { RafflesGoService } from "@/api";

export type SurveyWalk = Awaited<ReturnType<typeof RafflesGoService.listSurveyWalks>>["surveyWalks"][number];
export type WalkPerson = SurveyWalk["leader"];
