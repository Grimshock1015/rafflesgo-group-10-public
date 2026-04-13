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
        <main className="main-content">
            <div className="container create-survey-period-page">
                <Container className="welcome-header" mt={5}>
                    <h1>Edit Survey Period</h1>
                    <p className="welcome-subtitle">Update campaign details and parameters.</p>
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
                                    onChange={(e) => setMinWalks(parseInt(e.target.value) || 0)}
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