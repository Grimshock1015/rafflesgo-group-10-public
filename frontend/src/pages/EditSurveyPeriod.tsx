import { RafflesGoService } from "@/api/services/RafflesGoService";
import { DateRangePicker } from "@/components/DateRangePicker";
import { toaster } from "@/components/ui/toaster";
import { toIsoDateTime } from "@/lib/date";
import { Container, Button, Input, Stack, Field, type DateValue, Checkbox } from "@chakra-ui/react";
import { parseDate } from "@internationalized/date";
import { useEffect, useState } from "react";
import { MdSave } from "react-icons/md";
import { useNavigate, useParams } from "react-router-dom";

export default function EditSurveyPeriod() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [minWalks, setMinWalks] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [dateRange, setDateRange] = useState<DateValue[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
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
                })
            }
        } catch (error) {
            console.error("Failed to edit survey period:", error);
            toaster.create({
                type: "error",
                title: "Update failed",
                description: "Unable to update survey period. Please try again.",
                closable: true,
            })
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
                    setMinWalks(response.minWalks);
                    setIsFinished(response.isFinished);
                    setDateRange([
                        parseDate(response.startDate.split('T')[0]),
                        parseDate(response.endDate.split('T')[0])
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
    
    return (
        <form onSubmit={handleSubmit}>
            <main className="main-content">
                <Container display={"flex"} flexDirection={"column"} alignItems={"center"} gap={5}>
                    <Container justifyContent={"center"} display={"flex"} alignItems={"center"} mt={5}>
                        <h1>
                            Edit Survey Period
                        </h1>
                    </Container>
                    <Stack maxWidth={400} gap={4} width={"100%"}>
                        <Field.Root required>
                            <Field.Label>
                                Name <Field.RequiredIndicator />
                            </Field.Label>
                            <Input placeholder="Enter a name for the survey period" value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading} />
                        </Field.Root>
                        <Field.Root required>
                            <Field.Label>
                                Min. no. of walks <Field.RequiredIndicator />
                            </Field.Label>
                            <Input value={minWalks} onChange={(e) => setMinWalks(parseInt(e.target.value) || 0)} required disabled={isLoading} />
                        </Field.Root>
                        <Checkbox.Root display={"flex"} checked={isFinished} onCheckedChange={(checked) => setIsFinished(!!checked.checked)} disabled={isLoading}>
                            <Checkbox.HiddenInput />
                            <Checkbox.Control>
                                <Checkbox.Indicator />
                            </Checkbox.Control>
                            <Checkbox.Label>Is completed?</Checkbox.Label>
                        </Checkbox.Root>
                        <DateRangePicker value={dateRange} onChange={setDateRange} required disabled={isLoading} />
                        <Button variant="plain" className="btn btn-primary" alignSelf={"end"} mt={5} type="submit" loading={isSubmitting} disabled={isLoading}>
                            <MdSave />Save Changes
                        </Button>
                    </Stack>
                </Container>
            </main>
        </form>
    );
}