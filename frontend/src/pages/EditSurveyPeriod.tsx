import { RafflesGoService } from "@/api/services/RafflesGoService";
import { DateRangePicker } from "@/components/DateRangePicker";
import { toaster } from "@/components/ui/toaster";
import { toIsoDateTime } from "@/lib/date";
import { getNetworkErrorMessage } from "@/lib/networkError";
import { Box, Button, Checkbox, Container, Field, Input, Stack, Text, type DateValue } from "@chakra-ui/react";
import { parseDate } from "@internationalized/date";
import { useEffect, useMemo, useState } from "react";
import { MdSave } from "react-icons/md";
import { useNavigate, useParams } from "react-router-dom";

type BulkSlotState = {
    enabled: boolean;
    label: string;
    startTime: string;
    endTime: string;
};

function countMatchingWeekdays(dateRange: DateValue[], weekdays: number[]): number {
    if (dateRange.length < 2 || weekdays.length === 0) {
        return 0;
    }

    const start = new Date(`${dateRange[0].toString()}T00:00:00.000Z`);
    const end = new Date(`${dateRange[1].toString()}T00:00:00.000Z`);
    let total = 0;
    const cursor = new Date(start);

    while (cursor.getTime() <= end.getTime()) {
        if (weekdays.includes(cursor.getUTCDay())) {
            total += 1;
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return total;
}

export default function EditSurveyPeriod() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [minWalks, setMinWalks] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [dateRange, setDateRange] = useState<DateValue[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [bulkNamePrefix, setBulkNamePrefix] = useState("");
    const [bulkCapacity, setBulkCapacity] = useState(4);
    const [scheduleSaturday, setScheduleSaturday] = useState(true);
    const [scheduleSunday, setScheduleSunday] = useState(true);
    const [skipExisting, setSkipExisting] = useState(true);
    const [morningSlot, setMorningSlot] = useState<BulkSlotState>({
        enabled: true,
        label: "Morning",
        startTime: "08:00",
        endTime: "10:00",
    });
    const [afternoonSlot, setAfternoonSlot] = useState<BulkSlotState>({
        enabled: true,
        label: "Afternoon",
        startTime: "16:00",
        endTime: "18:00",
    });
    const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
    const surveyPeriodId = useParams().surveyPeriodId || "";

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await RafflesGoService.updateSurveyPeriod(surveyPeriodId, {
                name,
                minWalks,
                startDate: toIsoDateTime(dateRange[0]),
                endDate: toIsoDateTime(dateRange[1]),
                isFinished
            });

            if (response) {
                navigate("/survey-periods");
                toaster.create({
                    type: "success",
                    title: "Survey period updated",
                    description: "The survey period has been successfully updated.",
                    closable: true,
                });
            }
        } catch (error) {
            console.error("Failed to edit survey period:", error);
            toaster.create({
                type: "error",
                title: "Update failed",
                description: getNetworkErrorMessage(error, "Unable to update survey period. Please try again."),
                closable: true,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const fetchSurveyPeriod = async () => {
            if (!surveyPeriodId) return;
            setIsLoading(true);
            try {
                const response = await RafflesGoService.getSurveyPeriod(surveyPeriodId);
                if (response) {
                    setName(response.name);
                    setBulkNamePrefix(response.name);
                    setMinWalks(response.minWalks);
                    setIsFinished(response.isFinished);
                    setDateRange([
                        parseDate(response.startDate.split("T")[0]),
                        parseDate(response.endDate.split("T")[0])
                    ]);
                }
            } catch (error) {
                console.error("Failed to fetch survey period:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSurveyPeriod();
    }, [surveyPeriodId]);

    const selectedWeekdays = useMemo(() => {
        const weekdays: number[] = [];
        if (scheduleSaturday) weekdays.push(6);
        if (scheduleSunday) weekdays.push(0);
        return weekdays;
    }, [scheduleSaturday, scheduleSunday]);

    const enabledSlots = useMemo(
        () => [morningSlot, afternoonSlot].filter((slot) => slot.enabled),
        [morningSlot, afternoonSlot]
    );

    const estimatedDays = useMemo(
        () => countMatchingWeekdays(dateRange, selectedWeekdays),
        [dateRange, selectedWeekdays]
    );
    const estimatedWalks = estimatedDays * enabledSlots.length;

    const handleBulkCreate = async () => {
        if (!surveyPeriodId) {
            return;
        }

        if (selectedWeekdays.length === 0) {
            toaster.create({
                type: "error",
                title: "Choose a weekend day",
                description: "Select Saturday, Sunday, or both before scheduling walks.",
                closable: true,
            });
            return;
        }

        if (enabledSlots.length === 0) {
            toaster.create({
                type: "error",
                title: "Choose a time slot",
                description: "Enable at least one walk slot before scheduling.",
                closable: true,
            });
            return;
        }

        setIsBulkSubmitting(true);
        try {
            const response = await RafflesGoService.bulkCreateSurveyWalksForSurveyPeriod(surveyPeriodId, {
                namePrefix: bulkNamePrefix.trim() || name.trim() || "Survey Walk",
                weekdays: selectedWeekdays,
                timeSlots: enabledSlots.map((slot) => ({
                    label: slot.label.trim() || undefined,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                })),
                capacity: bulkCapacity,
                skipExisting,
            });

            toaster.create({
                type: "success",
                title: "Walks scheduled",
                description: response.skippedCount > 0
                    ? `Created ${response.createdCount} walks and skipped ${response.skippedCount} duplicates.`
                    : `Created ${response.createdCount} walks for the selected weekends.`,
                closable: true,
            });
        } catch (error) {
            console.error("Failed to bulk create survey walks:", error);
            toaster.create({
                type: "error",
                title: "Bulk scheduling failed",
                description: getNetworkErrorMessage(error, "Unable to schedule the weekend walks. Please review the slots and try again."),
                closable: true,
            });
        } finally {
            setIsBulkSubmitting(false);
        }
    };

    return (
        <main className="main-content">
            <div className="container create-survey-period-page">
                <Container className="welcome-header" mt={5}>
                    <h1>Edit Survey Period</h1>
                    <p className="welcome-subtitle">Update campaign details and schedule recurring weekend walks in one step.</p>
                </Container>

                <form onSubmit={handleSubmit} className="report-form">
                    <div className="card section-container">
                        <h3>Period Details</h3>
                        <Stack gap={2} width={"100%"}>
                            <Field.Root required className="submit-form-group" mb={0}>
                                <Field.Label>
                                    Name <Field.RequiredIndicator />
                                </Field.Label>
                                <Input
                                    className="sighting-control sighting-text-input"
                                    placeholder="Enter a name for the survey period"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </Field.Root>

                            <Field.Root required className="submit-form-group" mb={0}>
                                <Field.Label>
                                    Min. no. of walks per user <Field.RequiredIndicator />
                                </Field.Label>
                                <Input
                                    className="native-number-input sighting-control sighting-number-input"
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={minWalks}
                                    onChange={(e) => setMinWalks(parseInt(e.target.value, 10) || 0)}
                                    required
                                    disabled={isLoading}
                                />
                            </Field.Root>

                            <div className="submit-form-group">
                                <DateRangePicker value={dateRange} onChange={setDateRange} label="Date Range" required disabled={isLoading} />
                            </div>

                            <div className="submit-form-group">
                                <Checkbox.Root display={"flex"} checked={isFinished} onCheckedChange={(checked) => setIsFinished(!!checked.checked)} disabled={isLoading}>
                                    <Checkbox.HiddenInput />
                                    <Checkbox.Control>
                                        <Checkbox.Indicator />
                                    </Checkbox.Control>
                                    <Checkbox.Label>Is completed?</Checkbox.Label>
                                </Checkbox.Root>
                            </div>
                        </Stack>
                    </div>

                    <div className="card section-container">
                        <h3>Bulk Weekend Scheduler</h3>
                        <Stack gap={3} width={"100%"}>
                            <Text color="var(--text-secondary)">
                                Best-effort defaults schedule a morning and afternoon walk every weekend day in this period. Existing date-and-time matches are skipped automatically.
                            </Text>

                            <Field.Root required className="submit-form-group" mb={0}>
                                <Field.Label>
                                    Walk name prefix <Field.RequiredIndicator />
                                </Field.Label>
                                <Input
                                    className="sighting-control sighting-text-input"
                                    placeholder="e.g. April 2026 Weekend Walk"
                                    value={bulkNamePrefix}
                                    onChange={(e) => setBulkNamePrefix(e.target.value)}
                                    disabled={isLoading || isBulkSubmitting}
                                />
                            </Field.Root>

                            <Field.Root required className="submit-form-group" mb={0}>
                                <Field.Label>
                                    Capacity per walk <Field.RequiredIndicator />
                                </Field.Label>
                                <Input
                                    className="native-number-input sighting-control sighting-number-input"
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={bulkCapacity}
                                    onChange={(e) => setBulkCapacity(parseInt(e.target.value, 10) || 1)}
                                    disabled={isLoading || isBulkSubmitting}
                                />
                            </Field.Root>

                            <Stack
                                direction={{ base: "column", md: "row" }}
                                gap={{ base: 3, md: 6 }}
                                align={{ base: "stretch", md: "center" }}
                                pt={1}
                            >
                                <Checkbox.Root
                                    display="flex"
                                    alignItems="center"
                                    gap={2}
                                    minH="40px"
                                    checked={scheduleSaturday}
                                    onCheckedChange={(checked) => setScheduleSaturday(!!checked.checked)}
                                    disabled={isLoading || isBulkSubmitting}
                                >
                                    <Checkbox.HiddenInput />
                                    <Checkbox.Control>
                                        <Checkbox.Indicator />
                                    </Checkbox.Control>
                                    <Checkbox.Label>Saturday</Checkbox.Label>
                                </Checkbox.Root>

                                <Checkbox.Root
                                    display="flex"
                                    alignItems="center"
                                    gap={2}
                                    minH="40px"
                                    checked={scheduleSunday}
                                    onCheckedChange={(checked) => setScheduleSunday(!!checked.checked)}
                                    disabled={isLoading || isBulkSubmitting}
                                >
                                    <Checkbox.HiddenInput />
                                    <Checkbox.Control>
                                        <Checkbox.Indicator />
                                    </Checkbox.Control>
                                    <Checkbox.Label>Sunday</Checkbox.Label>
                                </Checkbox.Root>

                                <Checkbox.Root
                                    display="flex"
                                    alignItems="center"
                                    gap={2}
                                    minH="40px"
                                    checked={skipExisting}
                                    onCheckedChange={(checked) => setSkipExisting(!!checked.checked)}
                                    disabled={isLoading || isBulkSubmitting}
                                >
                                    <Checkbox.HiddenInput />
                                    <Checkbox.Control>
                                        <Checkbox.Indicator />
                                    </Checkbox.Control>
                                    <Checkbox.Label>Skip existing walks</Checkbox.Label>
                                </Checkbox.Root>
                            </Stack>

                            {[{
                                title: "Morning slot",
                                state: morningSlot,
                                setState: setMorningSlot,
                            }, {
                                title: "Afternoon slot",
                                state: afternoonSlot,
                                setState: setAfternoonSlot,
                            }].map(({ title, state, setState }) => (
                                <div key={title} className="submit-form-group">
                                    <Stack
                                        gap={3}
                                        p={4}
                                        borderWidth="1px"
                                        borderColor="var(--border-color-light)"
                                        borderRadius="var(--radius-md)"
                                        bg="var(--bg-secondary)"
                                    >
                                        <Checkbox.Root
                                            display="flex"
                                            alignItems="center"
                                            gap={2}
                                            minH="40px"
                                            checked={state.enabled}
                                            onCheckedChange={(checked) => setState({ ...state, enabled: !!checked.checked })}
                                            disabled={isLoading || isBulkSubmitting}
                                        >
                                            <Checkbox.HiddenInput />
                                            <Checkbox.Control>
                                                <Checkbox.Indicator />
                                            </Checkbox.Control>
                                            <Checkbox.Label>{title}</Checkbox.Label>
                                        </Checkbox.Root>

                                        <Stack direction={{ base: "column", lg: "row" }} gap={3} align={{ base: "stretch", lg: "end" }}>
                                            <Field.Root flex="1" mb={0}>
                                                <Field.Label>Slot label</Field.Label>
                                                <Input
                                                    className="sighting-control sighting-text-input"
                                                    placeholder="Slot label"
                                                    value={state.label}
                                                    onChange={(e) => setState({ ...state, label: e.target.value })}
                                                    disabled={isLoading || isBulkSubmitting || !state.enabled}
                                                />
                                            </Field.Root>
                                            <Stack direction={{ base: "column", sm: "row" }} gap={3} flex={{ base: "1", lg: "0 0 auto" }}>
                                                <Field.Root minW={{ base: "100%", sm: "160px" }} mb={0}>
                                                    <Field.Label>Start time</Field.Label>
                                                    <Input
                                                        className="sighting-control sighting-text-input"
                                                        type="time"
                                                        value={state.startTime}
                                                        onChange={(e) => setState({ ...state, startTime: e.target.value })}
                                                        disabled={isLoading || isBulkSubmitting || !state.enabled}
                                                    />
                                                </Field.Root>
                                                <Box alignSelf={{ base: "stretch", sm: "end" }} pb={{ base: 0, sm: 2 }} px={{ base: 0, sm: 1 }} color="var(--text-secondary)">
                                                    to
                                                </Box>
                                                <Field.Root minW={{ base: "100%", sm: "160px" }} mb={0}>
                                                    <Field.Label>End time</Field.Label>
                                                    <Input
                                                        className="sighting-control sighting-text-input"
                                                        type="time"
                                                        value={state.endTime}
                                                        onChange={(e) => setState({ ...state, endTime: e.target.value })}
                                                        disabled={isLoading || isBulkSubmitting || !state.enabled}
                                                    />
                                                </Field.Root>
                                            </Stack>
                                        </Stack>
                                    </Stack>
                                </div>
                            ))}

                            <Text color="var(--text-secondary)">
                                {estimatedWalks > 0
                                    ? `Estimated schedule: ${estimatedWalks} walks across ${estimatedDays} selected weekend days before duplicate checks.`
                                    : "Select at least one weekend day and one slot to generate a schedule."}
                            </Text>

                            <Button
                                variant="plain"
                                className="btn btn-secondary"
                                type="button"
                                onClick={handleBulkCreate}
                                loading={isBulkSubmitting}
                                disabled={isLoading}
                            >
                                {isBulkSubmitting ? "Scheduling..." : "Schedule Weekend Walks"}
                            </Button>
                        </Stack>
                    </div>

                    <div className="create-period-actions">
                        <Button variant="plain" className="btn btn-primary create-period-action-button" type="submit" loading={isSubmitting} disabled={isLoading}>
                            <MdSave />
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </div>
        </main>
    );
}
