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
        <form onSubmit={handleSubmit}>
            <main className="main-content">
                <Container display={"flex"} flexDirection={"column"} alignItems={"center"} gap={5}>
                    <Container justifyContent={"center"} display={"flex"} alignItems={"center"} mt={5}>
                        <h1>
                            Create Survey Period
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
                        <DateRangePicker value={dateRange} onChange={setDateRange} required />
                        <Button backgroundColor="green.fg" px={3} alignSelf={"end"} mt={5} type="submit" loading={isSubmitting}>
                            <IoMdAdd />Add survey period
                        </Button>
                    </Stack>
                </Container>
            </main>
        </form>
    );
}