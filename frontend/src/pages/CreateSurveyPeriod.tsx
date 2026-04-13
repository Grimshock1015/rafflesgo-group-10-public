import { RafflesGoService } from "@/api/services/RafflesGoService";
import { DateRangePicker } from "@/components/DateRangePicker";
import { toaster } from "@/components/ui/toaster";
import { toIsoDateTime } from "@/lib/date";
import { Container, Button, Input, Stack, Field, type DateValue } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";
import { IoMdAdd } from "react-icons/io";
import { useNavigate } from "react-router-dom";

export default function CreateSurveyPeriod() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [minWalks, setMinWalks] = useState(0);
    const [dateRange, setDateRange] = useState<DateValue[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await RafflesGoService.createSurveyPeriod({
                name,
                minWalks,
                startDate: toIsoDateTime(dateRange[0]),
                endDate: toIsoDateTime(dateRange[1]),
                isFinished: false
            });
            
            if (response) {
                navigate("/survey-periods");
                toaster.create({
                    type: "success",
                    title: "Survey period created",
                    description: "The survey period was created successfully.",
                    closable: true,
                })
            }
        } catch (error) {
            console.error("Failed to create survey period:", error);
            toaster.create({
                type: "error",
                title: "Creation failed",
                description: "Unable to create survey period. Please try again.",
                closable: true,
            })
        } finally {
            setIsSubmitting(false);
        }
    }
    
    return (
        <main className="main-content">
            <div className="container create-survey-period-page">
                <Container className="welcome-header" mt={5}>
                    <h1>Create Survey Period</h1>
                    <p className="welcome-subtitle">Define the campaign window and minimum participation target.</p>
                </Container>

                {/* <section className="card draft-link-card create-period-intro">
                    <div>
                        <h2>Set up a new survey campaign</h2>
                        <p className="text-secondary">The start and end dates control when associated survey walks can run.</p>
                    </div>
                </section> */}

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
                                />
                            </Field.Root>

                            <div className="submit-form-group">
                                <DateRangePicker value={dateRange} onChange={setDateRange} label="Date Range" required />
                            </div>
                        </Stack>
                    </div>

                    <div className="create-period-actions">
                        <Button variant="plain" className="btn btn-primary create-period-action-button" type="submit" loading={isSubmitting}>
                            <IoMdAdd />
                            {isSubmitting ? "Creating..." : "Add Survey Period"}
                        </Button>
                    </div>
                </form>
            </div>
        </main>
    );
}