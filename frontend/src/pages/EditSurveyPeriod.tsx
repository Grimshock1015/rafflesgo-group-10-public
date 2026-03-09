import { RafflesGoService } from "@/api/services/RafflesGoService";
import { Navigation } from "@/components/Navigation";
import { Container, Button, Input, DatePicker, Portal, Stack, Field, Flex, VStack, type DateValue, Checkbox } from "@chakra-ui/react";
import { parseDate } from "@internationalized/date";
import type { User } from "firebase/auth";
import { useEffect, useState } from "react";
import { MdSave } from "react-icons/md";
import { LuCalendar } from "react-icons/lu";
import { useNavigate, useParams } from "react-router-dom";

export default function EditSurveyPeriod({ user }: { user: User }) {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [minWalks, setMinWalks] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [dateRange, setDateRange] = useState<DateValue[]>([]);
    const surveyPeriodId = useParams().surveyPeriodId || "";
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const toIsoDateTime = (value?: DateValue): string => {
        if (!value) return "";
        const dateValue = value as DateValue & { toDate: (timeZone: string) => Date };
        return dateValue.toDate(timeZone).toISOString();
    };

    const fetchSurveyPeriod = async () => {
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
        }
    };

    useEffect(() => {
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
                        <DatePicker.Root selectionMode="range" maxWidth="32rem" onValueChange={(e) => {
                            setDateRange(e.value);
                        }} value={dateRange} required>
                            <DatePicker.Label>Select date range</DatePicker.Label>
                            <DatePicker.Control>
                                <DatePicker.Input index={0} />
                                <DatePicker.Input index={1} />
                                <DatePicker.IndicatorGroup>
                                <DatePicker.Trigger>
                                    <LuCalendar />
                                </DatePicker.Trigger>
                                </DatePicker.IndicatorGroup>
                            </DatePicker.Control>
                            <Portal>
                                <DatePicker.Positioner>
                                <DatePicker.Content>
                                    <Flex px="4" py="4" gap="6">
                                    <VStack align="stretch" gap="2" minW="140px" height="100%">
                                        <DatePicker.PresetTrigger value="last7Days" asChild>
                                        <Button variant="surface" size="sm" width="100%">
                                            Last 7 days
                                        </Button>
                                        </DatePicker.PresetTrigger>
                                        <DatePicker.PresetTrigger value="last30Days" asChild>
                                        <Button variant="surface" size="sm" width="100%">
                                            Last 30 days
                                        </Button>
                                        </DatePicker.PresetTrigger>
                                        <DatePicker.PresetTrigger value="thisMonth" asChild>
                                        <Button variant="surface" size="sm" width="100%">
                                            This month
                                        </Button>
                                        </DatePicker.PresetTrigger>
                                        <DatePicker.PresetTrigger value="lastMonth" asChild>
                                        <Button variant="surface" size="sm" width="100%">
                                            Last month
                                        </Button>
                                        </DatePicker.PresetTrigger>
                                        <DatePicker.PresetTrigger value="thisYear" asChild>
                                        <Button variant="surface" size="sm" width="100%">
                                            This year
                                        </Button>
                                        </DatePicker.PresetTrigger>
                                        <DatePicker.PresetTrigger value="lastYear" asChild>
                                        <Button variant="surface" size="sm" width="100%">
                                            Last year
                                        </Button>
                                        </DatePicker.PresetTrigger>
                                    </VStack>
                                    <Flex direction="column" flex="1" minW={0}>
                                        <DatePicker.View view="day">
                                        <DatePicker.Header />
                                        <DatePicker.DayTable />
                                        </DatePicker.View>
                                        <DatePicker.View view="month">
                                        <DatePicker.Header />
                                        <DatePicker.MonthTable />
                                        </DatePicker.View>
                                        <DatePicker.View view="year">
                                        <DatePicker.Header />
                                        <DatePicker.YearTable />
                                        </DatePicker.View>
                                    </Flex>
                                    </Flex>
                                </DatePicker.Content>
                                </DatePicker.Positioner>
                            </Portal>
                            </DatePicker.Root>
                        <Button backgroundColor="green.fg" px={3} alignSelf={"end"} mt={5} type="submit">
                            <MdSave />Save Changes
                        </Button>
                    </Stack>
                </Container>
            </main>
        </form>
    );
}