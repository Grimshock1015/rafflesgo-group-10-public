import { RafflesGoService } from "@/api/services/RafflesGoService";
import { toaster } from "@/components/ui/toaster";
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
                    description: "Unable to load survey periods. Please refresh and try again.",
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
                items: surveyPeriods.map((period) => ({ value: period.uid, label: period.name })),
            }),
        [surveyPeriods]
    );

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
                description: "Unable to create survey walk. Please try again.",
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
                        <h1>Create Survey Walk</h1>
                    </Container>
                    <Stack maxWidth={420} gap={4} width={"100%"}>
                        <Select.Root
                            collection={surveyPeriodCollection}
                            value={surveyPeriodUid}
                            onValueChange={(event) => setSurveyPeriodUid(event.value)}
                            disabled={isLoadingPeriods || surveyPeriods.length === 0}
                        >
                            <Select.HiddenSelect />
                            <Select.Label>Survey Period</Select.Label>
                            <Select.Control>
                                <Select.Trigger px={3} py={2}>
                                <Select.ValueText px={1} placeholder={"Select a survey period"}/>
                                </Select.Trigger>
                                <Select.IndicatorGroup pr={2}>
                                    <Select.Indicator />
                                </Select.IndicatorGroup>
                            </Select.Control>
                            <Select.Positioner>
                                <Select.Content>
                                    {surveyPeriodCollection.items.map((item) => (
                                        <Select.Item item={item} key={item.value} py={2} px={2}>
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
                            <Input placeholder="Enter a name for the survey walk" value={name} onChange={(e) => setName(e.target.value)} required />
                        </Field.Root>

                        <Field.Root required>
                            <Field.Label>
                                Date <Field.RequiredIndicator />
                            </Field.Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                                min={surveyPeriodUid[0] ? getDateFromIso(surveyPeriods.find((p) => p.uid === surveyPeriodUid[0])?.startDate || '') : undefined}
                                max={surveyPeriodUid[0] ? getDateFromIso(surveyPeriods.find((p) => p.uid === surveyPeriodUid[0])?.endDate || '') : undefined}
                                style={{ lineHeight: 1.5, paddingTop: "0.1875rem", paddingBottom: "0.1875rem" }}
                            />
                        </Field.Root>

                        <Field.Root required>
                            <Field.Label>
                                Start time <Field.RequiredIndicator />
                            </Field.Label>
                            <Input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                required
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
                                style={{ lineHeight: 1.5, paddingTop: "0.1875rem", paddingBottom: "0.1875rem" }}
                            />
                        </Field.Root>

                        <Field.Root required>
                            <Field.Label>
                                Capacity <Field.RequiredIndicator />
                            </Field.Label>
                            <Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 1)} required />
                        </Field.Root>

                        <Button backgroundColor="green.fg" px={3} alignSelf={"end"} mt={5} type="submit" loading={isSubmitting} disabled={isLoadingPeriods || surveyPeriods.length === 0}>
                            <IoMdAdd />Add survey walk
                        </Button>
                    </Stack>
                </Container>
            </main>
        </form>
    );
}
