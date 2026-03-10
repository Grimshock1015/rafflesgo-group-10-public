import { RafflesGoService } from "@/api/services/RafflesGoService";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Navigation } from "@/components/Navigation";
import { toaster } from "@/components/ui/toaster";
import { toIsoDateTime } from "@/lib/date";
import { Container, Button, Input, Stack, Field, type DateValue, Checkbox } from "@chakra-ui/react";
import { parseDate } from "@internationalized/date";
import type { User } from "firebase/auth";
import { useEffect, useState } from "react";
import { MdSave } from "react-icons/md";
import { useNavigate, useParams } from "react-router-dom";

export default function EditSurveyPeriod({ user }: { user: User }) {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [minWalks, setMinWalks] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [dateRange, setDateRange] = useState<DateValue[]>([]);
    const surveyPeriodId = useParams().surveyPeriodId || "";

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
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
            }
        } catch (error) {
            console.error("Failed to edit survey period:", error);
            toaster.create({
                type: "error",
                title: "Update failed",
                description: "Unable to update survey period. Please try again.",
                closable: true,
            })
        }
    };

    useEffect(() => {
        const fetchSurveyPeriod = async () => {
            if (!surveyPeriodId) return;
            try {
                const response = await RafflesGoService.getSurveyPeriod(surveyPeriodId);
                if (response) {
                    setName(response.name);
                    setMinWalks(response.minWalks);
                    setIsFinished(response.isFinished);
                    setDateRange([
                        parseDate(new Date(response.startDate).toISOString().split('T')[0]),
                        parseDate(new Date(response.endDate).toISOString().split('T')[0])
                    ]);
                }
            } catch (error) {
                console.error("Failed to fetch survey period:", error);
            }
        };

        fetchSurveyPeriod();
    }, [surveyPeriodId]);
    
    return (
        <form onSubmit={handleSubmit}>
            <Navigation user={user} />
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
                            <Input placeholder="Enter a name for the survey period" value={name} onChange={(e) => setName(e.target.value)} required />
                        </Field.Root>
                        <Field.Root required>
                            <Field.Label>
                                Min. no. of walks <Field.RequiredIndicator />
                            </Field.Label>
                            <Input value={minWalks} onChange={(e) => setMinWalks(parseInt(e.target.value) || 0)} required />
                        </Field.Root>
                        <Checkbox.Root display={"flex"} checked={isFinished} onCheckedChange={(checked) => setIsFinished(!!checked.checked)}>
                            <Checkbox.HiddenInput />
                            <Checkbox.Control>
                                <Checkbox.Indicator />
                            </Checkbox.Control>
                            <Checkbox.Label>Is completed?</Checkbox.Label>
                        </Checkbox.Root>
                        <DateRangePicker value={dateRange} onChange={setDateRange} required />
                        <Button backgroundColor="green.fg" px={3} alignSelf={"end"} mt={5} type="submit">
                            <MdSave />Save Changes
                        </Button>
                    </Stack>
                </Container>
            </main>
        </form>
    );
}