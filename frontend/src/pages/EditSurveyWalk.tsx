import { RafflesGoService } from "@/api/services/RafflesGoService";
import { ObservationDatePicker } from "@/components/ObservationDatePicker";
import { toaster } from "@/components/ui/toaster";
import { useTheme } from "@/contexts/ThemeContext";
import { Container, Button, Input, Stack, Field, Checkbox, Select, createListCollection, Text } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { MdSave } from "react-icons/md";
import { useNavigate, useParams } from "react-router-dom";

type SurveyPeriodOption = {
    uid: string;
    name: string;
    startDate: string;
    endDate: string;
};

type VolunteerOption = {
    uid: string;
    name: string;
};

function formatSurveyPeriodLabel(period: SurveyPeriodOption): string {
    const start = new Date(period.startDate).toLocaleDateString("en-SG", { timeZone: "UTC" });
    const end = new Date(period.endDate).toLocaleDateString("en-SG", { timeZone: "UTC" });
    return `${period.name} (${start} - ${end})`;
}

function toUtcIsoDate(date: string): string {
    return new Date(`${date}T00:00:00.000Z`).toISOString();
}

function getDateFromIso(isoString: string): string {
    return isoString.split('T')[0];
}

function getWalkEndDateTime(dateIso: string, endTime: string): Date {
    const walkDate = new Date(dateIso);
    const [hours, minutes] = endTime.split(":").map(Number);
    walkDate.setUTCHours(hours, minutes, 0, 0);
    return walkDate;
}

export default function EditSurveyWalk() {
    const navigate = useNavigate();
    const surveyWalkId = useParams().surveyWalkId || "";
    const { effectiveTheme } = useTheme();

    const [surveyPeriodUid, setSurveyPeriodUid] = useState<string[]>([]);
    const [name, setName] = useState("");
    const [date, setDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [capacity, setCapacity] = useState(1);
    const [isFinished, setIsFinished] = useState(false);
    const [volunteers, setVolunteers] = useState<VolunteerOption[]>([]);
    const [selectedVolunteerUids, setSelectedVolunteerUids] = useState<string[]>([]);
    const [selectedAttendeeUids, setSelectedAttendeeUids] = useState<string[]>([]);
    const [leaderUid, setLeaderUid] = useState<string[]>([]);

    const [surveyPeriods, setSurveyPeriods] = useState<SurveyPeriodOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const surveyPeriodCollection = useMemo(
        () =>
            createListCollection({
                items: surveyPeriods.map((period) => ({ value: period.uid, label: formatSurveyPeriodLabel(period) })),
            }),
        [surveyPeriods]
    );
    const selectedSurveyPeriod = surveyPeriods.find((period) => period.uid === surveyPeriodUid[0]);
    const selectedVolunteers = volunteers.filter((volunteer) => selectedVolunteerUids.includes(volunteer.uid));
    const leaderCollection = useMemo(
        () =>
            createListCollection({
                items: selectedVolunteers.map((volunteer) => ({ value: volunteer.uid, label: volunteer.name || volunteer.uid })),
            }),
        [selectedVolunteers]
    );
    const selectBg = effectiveTheme === "dark" ? "gray.800" : "white";
    const selectBorder = effectiveTheme === "dark" ? "gray.600" : "gray.200";
    const selectText = effectiveTheme === "dark" ? "whiteAlpha.900" : "gray.800";
    const selectPlaceholder = effectiveTheme === "dark" ? "whiteAlpha.700" : "gray.500";
    const selectItemHoverBg = effectiveTheme === "dark" ? "gray.700" : "gray.50";

    useEffect(() => {
        const fetchData = async () => {
            if (!surveyWalkId) return;

            setIsLoading(true);
            try {
                const [walkResponse, periodResponse] = await Promise.all([
                    RafflesGoService.getSurveyWalk(surveyWalkId),
                    RafflesGoService.listSurveyPeriods(),
                ]);

                const options = periodResponse.surveyPeriods.map((period) => ({
                    uid: period.uid,
                    name: period.name,
                    startDate: period.startDate,
                    endDate: period.endDate,
                }));
                setSurveyPeriods(options);

                setSurveyPeriodUid([walkResponse.surveyPeriodUid]);
                setName(walkResponse.name);
                setDate(walkResponse.date.split("T")[0]);
                setStartTime(walkResponse.startTime);
                setEndTime(walkResponse.endTime);
                setCapacity(walkResponse.capacity);
                setIsFinished(walkResponse.isFinished);
                setVolunteers(walkResponse.volunteers);
                setSelectedVolunteerUids(walkResponse.volunteerUids);
                setSelectedAttendeeUids(walkResponse.attendeeUids);
                setLeaderUid(walkResponse.leader.uid ? [walkResponse.leader.uid] : []);
            } catch (error) {
                console.error("Failed to load survey walk:", error);
                toaster.create({
                    type: "error",
                    title: "Load failed",
                    description: "Unable to load survey walk details. Please try again.",
                    closable: true,
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [surveyWalkId]);

    useEffect(() => {
        const minDate = selectedSurveyPeriod ? getDateFromIso(selectedSurveyPeriod.startDate) : "";
        const maxDate = selectedSurveyPeriod ? getDateFromIso(selectedSurveyPeriod.endDate) : "";

        if (date && ((minDate && date < minDate) || (maxDate && date > maxDate))) {
            setDate("");
        }
    }, [date, selectedSurveyPeriod]);

    useEffect(() => {
        setSelectedAttendeeUids((current) => current.filter((uid) => selectedVolunteerUids.includes(uid)));

        if (leaderUid[0] && selectedVolunteerUids.includes(leaderUid[0])) {
            return;
        }

        setLeaderUid(selectedVolunteerUids.length > 0 ? [selectedVolunteerUids[0]] : []);
    }, [leaderUid, selectedVolunteerUids]);

    const canRemoveVolunteers = surveyWalkId !== "" && date !== "" && endTime !== ""
        ? getWalkEndDateTime(toUtcIsoDate(date), endTime).getTime() > Date.now()
        : false;

    const toggleVolunteer = (volunteerUid: string, checked: boolean) => {
        setSelectedVolunteerUids((current) => checked
            ? [...new Set([...current, volunteerUid])]
            : current.filter((uid) => uid !== volunteerUid));
    };

    const toggleAttendee = (volunteerUid: string, checked: boolean) => {
        setSelectedAttendeeUids((current) => checked
            ? [...new Set([...current, volunteerUid])]
            : current.filter((uid) => uid !== volunteerUid));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!surveyWalkId || !surveyPeriodUid[0]) {
            toaster.create({
                type: "error",
                title: "Missing data",
                description: "Survey period and survey walk are required.",
                closable: true,
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await RafflesGoService.updateSurveyWalk(surveyWalkId, {
                surveyPeriodUid: surveyPeriodUid[0],
                name,
                date: toUtcIsoDate(date),
                startTime,
                endTime,
                capacity,
                isFinished,
                volunteerUids: selectedVolunteerUids,
                attendeeUids: isFinished ? selectedAttendeeUids : [],
                leader: leaderUid[0] ?? "",
            });

            if (response) {
                navigate("/survey-walks");
                toaster.create({
                    type: "success",
                    title: "Survey walk updated",
                    description: "The survey walk has been successfully updated.",
                    closable: true,
                });
            }
        } catch (error) {
            console.error("Failed to update survey walk:", error);
            toaster.create({
                type: "error",
                title: "Update failed",
                description: "Unable to update survey walk. Please try again.",
                closable: true,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <main className="main-content">
                <Container display={"flex"} flexDirection={"column"} alignItems={"center"} gap={5}>
                    <Container justifyContent={"center"} display={"flex"} alignItems={"center"} mt={5}>
                        <h1>Edit Survey Walk</h1>
                    </Container>
                    <Stack maxWidth={420} gap={4} width={"100%"}>
                        <Select.Root
                            collection={surveyPeriodCollection}
                            value={surveyPeriodUid}
                            onValueChange={(event) => setSurveyPeriodUid(event.value)}
                            disabled={isLoading || surveyPeriods.length === 0}
                        >
                            <Select.HiddenSelect />
                            <Select.Label>Survey Period</Select.Label>
                            <Select.Control>
                                <Select.Trigger px={3} py={2} bg={selectBg} borderColor={selectBorder} color={selectText}>
                                <Select.ValueText px={1} placeholder={"Select a survey period"} color={surveyPeriodUid[0] ? selectText : selectPlaceholder}/>
                                </Select.Trigger>
                                <Select.IndicatorGroup pr={2}>
                                    <Select.Indicator color={selectText} />
                                </Select.IndicatorGroup>
                            </Select.Control>
                            <Select.Positioner>
                                <Select.Content bg={selectBg} borderColor={selectBorder} color={selectText}>
                                    {surveyPeriodCollection.items.map((item) => (
                                        <Select.Item item={item} key={item.value} py={2} px={2} bg={selectBg} color={selectText} _highlighted={{ bg: selectItemHoverBg }}>
                                            {item.label}
                                            <Select.ItemIndicator />
                                        </Select.Item>
                                    ))}
                                </Select.Content>
                            </Select.Positioner>
                        </Select.Root>

                        <Field.Root required>
                            <Field.Label>
                                Walk name <Field.RequiredIndicator />
                            </Field.Label>
                            <Input placeholder="Enter a name for the survey walk" value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading} />
                        </Field.Root>

                        <ObservationDatePicker
                            id="survey-walk-date"
                            label="Date"
                            value={date}
                            onChange={setDate}
                            required
                            disabled={isLoading || !selectedSurveyPeriod}
                            minDate={selectedSurveyPeriod ? getDateFromIso(selectedSurveyPeriod.startDate) : undefined}
                            maxDate={selectedSurveyPeriod ? getDateFromIso(selectedSurveyPeriod.endDate) : undefined}
                        />

                        <Field.Root required>
                            <Field.Label>
                                Start time <Field.RequiredIndicator />
                            </Field.Label>
                            <Input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                required
                                disabled={isLoading}
                                style={{ lineHeight: 1.5, paddingTop: "0.1875rem", paddingBottom: "0.1875rem" }}
                            />
                        </Field.Root>

                        <Field.Root required>
                            <Field.Label>
                                End time <Field.RequiredIndicator />
                            </Field.Label>
                            <Input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                required
                                disabled={isLoading}
                                style={{ lineHeight: 1.5, paddingTop: "0.1875rem", paddingBottom: "0.1875rem" }}
                            />
                        </Field.Root>

                        <Field.Root required>
                            <Field.Label>
                                Capacity <Field.RequiredIndicator />
                            </Field.Label>
                            <Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 1)} required disabled={isLoading} />
                        </Field.Root>

                        <Checkbox.Root display={"flex"} checked={isFinished} onCheckedChange={(checked) => setIsFinished(!!checked.checked)} disabled={isLoading}>
                            <Checkbox.HiddenInput />
                            <Checkbox.Control>
                                <Checkbox.Indicator />
                            </Checkbox.Control>
                            <Checkbox.Label>Is completed?</Checkbox.Label>
                        </Checkbox.Root>

                        <Field.Root>
                            <Field.Label>Walk leader</Field.Label>
                            <Select.Root
                                collection={leaderCollection}
                                value={leaderUid}
                                onValueChange={(event) => setLeaderUid(event.value)}
                                disabled={isLoading || selectedVolunteerUids.length === 0}
                            >
                                <Select.HiddenSelect />
                                <Select.Control>
                                    <Select.Trigger px={3} py={2} bg={selectBg} borderColor={selectBorder} color={selectText}>
                                        <Select.ValueText px={1} placeholder={"Select a leader"} color={leaderUid[0] ? selectText : selectPlaceholder} />
                                    </Select.Trigger>
                                    <Select.IndicatorGroup pr={2}>
                                        <Select.Indicator color={selectText} />
                                    </Select.IndicatorGroup>
                                </Select.Control>
                                <Select.Positioner>
                                    <Select.Content bg={selectBg} borderColor={selectBorder} color={selectText}>
                                        {leaderCollection.items.map((item) => (
                                            <Select.Item item={item} key={item.value} py={2} px={2} bg={selectBg} color={selectText} _highlighted={{ bg: selectItemHoverBg }}>
                                                {item.label}
                                                <Select.ItemIndicator />
                                            </Select.Item>
                                        ))}
                                    </Select.Content>
                                </Select.Positioner>
                            </Select.Root>
                        </Field.Root>

                        <Field.Root>
                            <Field.Label>Registered volunteers</Field.Label>
                            <Stack gap={2}>
                                {volunteers.length === 0 ? (
                                    <Text color={selectPlaceholder}>No volunteers have joined this walk yet.</Text>
                                ) : (
                                    volunteers.map((volunteer) => (
                                        <Checkbox.Root
                                            key={volunteer.uid}
                                            display={"flex"}
                                            checked={selectedVolunteerUids.includes(volunteer.uid)}
                                            onCheckedChange={(checked) => toggleVolunteer(volunteer.uid, !!checked.checked)}
                                            disabled={isLoading || !canRemoveVolunteers}
                                        >
                                            <Checkbox.HiddenInput />
                                            <Checkbox.Control>
                                                <Checkbox.Indicator />
                                            </Checkbox.Control>
                                            <Checkbox.Label>{volunteer.name || volunteer.uid}</Checkbox.Label>
                                        </Checkbox.Root>
                                    ))
                                )}
                                {!canRemoveVolunteers && volunteers.length > 0 ? (
                                    <Text fontSize="sm" color={selectPlaceholder}>
                                        Volunteer removal is only available for upcoming walks.
                                    </Text>
                                ) : null}
                            </Stack>
                        </Field.Root>

                        <Field.Root>
                            <Field.Label>Attendance</Field.Label>
                            <Stack gap={2}>
                                {selectedVolunteers.length === 0 ? (
                                    <Text color={selectPlaceholder}>No registered volunteers available for attendance.</Text>
                                ) : (
                                    selectedVolunteers.map((volunteer) => (
                                        <Checkbox.Root
                                            key={volunteer.uid}
                                            display={"flex"}
                                            checked={selectedAttendeeUids.includes(volunteer.uid)}
                                            onCheckedChange={(checked) => toggleAttendee(volunteer.uid, !!checked.checked)}
                                            disabled={isLoading || !isFinished}
                                        >
                                            <Checkbox.HiddenInput />
                                            <Checkbox.Control>
                                                <Checkbox.Indicator />
                                            </Checkbox.Control>
                                            <Checkbox.Label>{volunteer.name || volunteer.uid}</Checkbox.Label>
                                        </Checkbox.Root>
                                    ))
                                )}
                                {!isFinished ? (
                                    <Text fontSize="sm" color={selectPlaceholder}>
                                        Mark the walk as completed to edit attendance. Turning completion off will clear attendance.
                                    </Text>
                                ) : null}
                            </Stack>
                        </Field.Root>

                        <Button backgroundColor="green.fg" px={3} alignSelf={"end"} mt={5} type="submit" loading={isSubmitting} disabled={isLoading}>
                            <MdSave />Save Changes
                        </Button>
                    </Stack>
                </Container>
            </main>
        </form>
    );
}
