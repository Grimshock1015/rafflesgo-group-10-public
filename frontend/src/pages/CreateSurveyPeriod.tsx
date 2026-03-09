import { RafflesGoService } from "@/api/services/RafflesGoService";
import { Navigation } from "@/components/Navigation";
import { Container, Button, Input, DatePicker, Portal, Stack, Field, Flex, VStack, type DateValue } from "@chakra-ui/react";
import type { User } from "firebase/auth";
import { useState, type FormEvent } from "react";
import { IoMdAdd } from "react-icons/io";
import { LuCalendar } from "react-icons/lu";
import { useNavigate } from "react-router-dom";

export default function CreateSurveyPeriod({ user }: { user: User }) {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [minWalks, setMinWalks] = useState(0);
    const [dateRange, setDateRange] = useState<DateValue[]>([]);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const toIsoDateTime = (value?: DateValue): string => {
        if (!value) return "";
        const dateValue = value as DateValue & { toDate: (timeZone: string) => Date };
        return dateValue.toDate(timeZone).toISOString();
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
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
            }
        } catch (error) {
            console.error("Failed to create survey period:", error);
        }
    }
    
    return (
        <form onSubmit={handleSubmit}>
            <Navigation user={user} />
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
                            <IoMdAdd />Add survey period
                        </Button>
                    </Stack>
                </Container>
            </main>
        </form>
    );
}