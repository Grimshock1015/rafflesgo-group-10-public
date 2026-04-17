import { RafflesGoService } from "@/api/services/RafflesGoService";
import { ObservationDatePicker } from "@/components/ObservationDatePicker";
import { toaster } from "@/components/ui/toaster";
import { getNetworkErrorMessage } from "@/lib/networkError";
import { Container, Button, Input, Stack, Field, Select, createListCollection } from "@chakra-ui/react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { IoMdAdd } from "react-icons/io";
import { useNavigate } from "react-router-dom";

type SurveyPeriodOption = {
    uid: string;
    name: string;
    startDate: string;
    endDate: string;
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

export default function CreateSurveyWalk() {
    const navigate = useNavigate();
    const [surveyPeriodUid, setSurveyPeriodUid] = useState<string[]>([]);
    const [name, setName] = useState("");
    const [date, setDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [capacity, setCapacity] = useState(1);
    const [surveyPeriods, setSurveyPeriods] = useState<SurveyPeriodOption[]>([]);
    const [isLoadingPeriods, setIsLoadingPeriods] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchSurveyPeriods = async () => {
            try {
                const response = await RafflesGoService.listSurveyPeriods();
                const options = response.surveyPeriods.map((period) => ({
                    uid: period.uid,
                    name: period.name,
                    startDate: period.startDate,
                    endDate: period.endDate,
                }));
                setSurveyPeriods(options);
                if (options.length > 0) {
                    setSurveyPeriodUid([options[0].uid]);
                }
            } catch (error) {
                console.error("Failed to load survey periods:", error);
                toaster.create({
                    type: "error",
                    title: "Failed to load survey periods",
                    description: getNetworkErrorMessage(error, "Unable to load survey periods. Please refresh and try again."),
                    closable: true,
                });
            } finally {
                setIsLoadingPeriods(false);
            }
        };

        fetchSurveyPeriods();
    }, []);

    const surveyPeriodCollection = useMemo(
        () =>
            createListCollection({
                items: surveyPeriods.map((period) => ({ value: period.uid, label: formatSurveyPeriodLabel(period) })),
            }),
        [surveyPeriods]
    );
    const selectedSurveyPeriod = surveyPeriods.find((period) => period.uid === surveyPeriodUid[0]);

    useEffect(() => {
        const minDate = selectedSurveyPeriod ? getDateFromIso(selectedSurveyPeriod.startDate) : "";
        const maxDate = selectedSurveyPeriod ? getDateFromIso(selectedSurveyPeriod.endDate) : "";

        if (date && ((minDate && date < minDate) || (maxDate && date > maxDate))) {
            setDate("");
        }
    }, [date, selectedSurveyPeriod]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!surveyPeriodUid[0]) {
            toaster.create({
                type: "error",
                title: "Survey period required",
                description: "Please choose a survey period.",
                closable: true,
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await RafflesGoService.createSurveyWalk({
                surveyPeriodUid: surveyPeriodUid[0],
                name,
                date: toUtcIsoDate(date),
                startTime,
                endTime,
                capacity,
                isFinished: false,
            });

            if (response) {
                navigate("/survey-walks");
                toaster.create({
                    type: "success",
                    title: "Survey walk created",
                    description: "The survey walk was created successfully.",
                    closable: true,
                });
            }
        } catch (error) {
            console.error("Failed to create survey walk:", error);
            toaster.create({
                type: "error",
                title: "Creation failed",
                description: getNetworkErrorMessage(error, "Unable to create survey walk. Please try again."),
                closable: true,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="main-content">
            <div className="container create-survey-period-page">
                <Container className="welcome-header" mt={5}>
                    <h1>Create Survey Walk</h1>
                    <p className="welcome-subtitle">Schedule a new survey walk within a campaign period.</p>
                </Container>

                <form onSubmit={handleSubmit} className="report-form">
                    <div className="card section-container">
                        <h3>Walk Details</h3>
                        <Stack gap={2} width={"100%"}>
                            <div className="submit-form-group">
                                <Select.Root
                                    collection={surveyPeriodCollection}
                                    value={surveyPeriodUid}
                                    onValueChange={(event) => setSurveyPeriodUid(event.value)}
                                    disabled={isLoadingPeriods || surveyPeriods.length === 0}
                                    
                                >
                                    <Select.HiddenSelect />
                                    <Select.Label>Survey Period</Select.Label>
                                    <Select.Control>
                                        <Select.Trigger px={3} py={2} bg="var(--white)" borderColor="var(--border-color-light)" color="var(--text-primary)" className="sighting-control">
                                        <Select.ValueText px={1} placeholder={"Select a survey period"} color="var(--text-primary)"/>
                                        </Select.Trigger>
                                        <Select.IndicatorGroup pr={2}>
                                            <Select.Indicator color="var(--text-primary)" />
                                        </Select.IndicatorGroup>
                                    </Select.Control>
                                    <Select.Positioner>
                                        <Select.Content bg="var(--white)" borderColor="var(--border-color-light)" color="var(--text-primary)">
                                            {surveyPeriodCollection.items.map((item) => (
                                                <Select.Item item={item} key={item.value} py={2} px={2} bg="var(--white)" color="var(--text-primary)" _highlighted={{ bg: "var(--bg-hover)" }}>
                                                    {item.label}
                                                    <Select.ItemIndicator />
                                                </Select.Item>
                                            ))}
                                        </Select.Content>
                                    </Select.Positioner>
                                </Select.Root>
                            </div>

                            <Field.Root required className="submit-form-group" mb={0}>
                                <Field.Label>
                                    Walk name <Field.RequiredIndicator />
                                </Field.Label>
                                <Input
                                    className="sighting-control sighting-text-input"
                                    placeholder="Enter a name for the survey walk"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </Field.Root>

                            <div className="submit-form-group">
                                <ObservationDatePicker
                                    id="survey-walk-date"
                                    label="Date"
                                    value={date}
                                    onChange={setDate}
                                    required
                                    labelSize="sm"
                                    disabled={isLoadingPeriods || !selectedSurveyPeriod}
                                    minDate={selectedSurveyPeriod ? getDateFromIso(selectedSurveyPeriod.startDate) : undefined}
                                    maxDate={selectedSurveyPeriod ? getDateFromIso(selectedSurveyPeriod.endDate) : undefined}
                                />
                            </div>

                            <Field.Root required className="submit-form-group" mb={0}>
                                <Field.Label>
                                    Start time <Field.RequiredIndicator />
                                </Field.Label>
                                <Input
                                    className="sighting-control"
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                    style={{ lineHeight: 1.5, paddingTop: "0.1875rem", paddingBottom: "0.1875rem" }}
                                />
                            </Field.Root>

                            <Field.Root required className="submit-form-group" mb={0}>
                                <Field.Label>
                                    End time <Field.RequiredIndicator />
                                </Field.Label>
                                <Input
                                    className="sighting-control"
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    required
                                    style={{ lineHeight: 1.5, paddingTop: "0.1875rem", paddingBottom: "0.1875rem" }}
                                />
                            </Field.Root>

                            <Field.Root required className="submit-form-group" mb={0}>
                                <Field.Label>
                                    Capacity <Field.RequiredIndicator />
                                </Field.Label>
                                <Input
                                    className="native-number-input sighting-control sighting-number-input"
                                    type="number"
                                    min={1}
                                    value={capacity}
                                    onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 1)}
                                    required
                                />
                            </Field.Root>
                        </Stack>
                    </div>

                    <div className="create-period-actions">
                        <Button variant="plain" className="btn btn-primary create-period-action-button" type="submit" loading={isSubmitting} disabled={isLoadingPeriods || surveyPeriods.length === 0}>
                            <IoMdAdd />
                            {isSubmitting ? "Creating..." : "Add Survey Walk"}
                        </Button>
                    </div>
                </form>
            </div>
        </main>
    );
}
