import { RafflesGoService } from "@/api/services/RafflesGoService";
import { toaster } from "@/components/ui/toaster";
import { Container, Button, Input, Stack, Field, Checkbox, Select, createListCollection } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { MdSave } from "react-icons/md";
import { useNavigate, useParams } from "react-router-dom";

type SurveyPeriodOption = {
    uid: string;
    name: string;
};

function toUtcIsoDate(date: string): string {
    return new Date(`${date}T00:00:00.000Z`).toISOString();
}

export default function EditSurveyWalk() {
    const navigate = useNavigate();
    const surveyWalkId = useParams().surveyWalkId || "";

    const [surveyPeriodUid, setSurveyPeriodUid] = useState<string[]>([]);
    const [name, setName] = useState("");
    const [date, setDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [capacity, setCapacity] = useState(1);
    const [isFinished, setIsFinished] = useState(false);

    const [surveyPeriods, setSurveyPeriods] = useState<SurveyPeriodOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const surveyPeriodCollection = useMemo(
        () =>
            createListCollection({
                items: surveyPeriods.map((period) => ({ value: period.uid, label: period.name })),
            }),
        [surveyPeriods]
    );

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
                }));
                setSurveyPeriods(options);

                setSurveyPeriodUid([walkResponse.surveyPeriodUid]);
                setName(walkResponse.name);
                setDate(walkResponse.date.split("T")[0]);
                setStartTime(walkResponse.startTime);
                setEndTime(walkResponse.endTime);
                setCapacity(walkResponse.capacity);
                setIsFinished(walkResponse.isFinished);
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
                                <Select.Trigger px={3}>
                                    <Select.ValueText placeholder="Select a survey period" />
                                </Select.Trigger>
                                <Select.IndicatorGroup>
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
                            <Input placeholder="Enter a name for the survey walk" value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading} />
                        </Field.Root>

                        <Field.Root required>
                            <Field.Label>
                                Date <Field.RequiredIndicator />
                            </Field.Label>
                            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required disabled={isLoading} />
                        </Field.Root>

                        <Field.Root required>
                            <Field.Label>
                                Start time <Field.RequiredIndicator />
                            </Field.Label>
                            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required disabled={isLoading} />
                        </Field.Root>

                        <Field.Root required>
                            <Field.Label>
                                End time <Field.RequiredIndicator />
                            </Field.Label>
                            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required disabled={isLoading} />
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

                        <Button backgroundColor="green.fg" px={3} alignSelf={"end"} mt={5} type="submit" loading={isSubmitting} disabled={isLoading}>
                            <MdSave />Save Changes
                        </Button>
                    </Stack>
                </Container>
            </main>
        </form>
    );
}
