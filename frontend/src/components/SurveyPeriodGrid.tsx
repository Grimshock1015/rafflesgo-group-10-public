import { RafflesGoService } from "@/api";
import { Badge, Button, Card, Grid, GridItem, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { MdDelete, MdModeEdit } from "react-icons/md";

type SurveyPeriod = Awaited<ReturnType<typeof RafflesGoService.listSurveyPeriods>>["surveyPeriods"][number];

export default function SurveyPeriodGrid() {
    const [surveyPeriods, setSurveyPeriods] = useState<SurveyPeriod[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSurveyPeriods = async () => {
            try {
                const response = await RafflesGoService.listSurveyPeriods();
                setSurveyPeriods(response.surveyPeriods);
            } catch (error) {
                console.error("Failed to fetch survey periods:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSurveyPeriods();
    }, []);

    if (isLoading) {
        return <Text>Loading survey periods...</Text>;
    }

    if (surveyPeriods.length === 0) {
        return <Text>No survey periods found.</Text>;
    }

    return (
        <Grid templateColumns="repeat(auto-fill, minmax(320px, 1fr))" gap={4} mt={5}>
            {surveyPeriods.map((sp) => (
                <GridItem key={sp.uid}>
                    <Card.Root h="100%" p={3}>
                        <Card.Body>
                            <Stack>
                                <Stack direction="row" justify="space-between" align="center">
                                    <Card.Title>{sp.name}</Card.Title>
                                    <Badge colorPalette={sp.isFinished ? "green" : "orange"} p={1}>
                                        {sp.isFinished ? "Finished" : "Ongoing"}
                                    </Badge>
                                </Stack>

                                <Stack gap={0}>
                                    <Text lineHeight={0.5}>
                                        Start: {new Date(sp.startDate).toLocaleDateString()}
                                    </Text>
                                    <Text lineHeight={0.5}>
                                        End: {new Date(sp.endDate).toLocaleDateString()}
                                    </Text>
                                    <Text lineHeight={0.5}>
                                        Min. walks: {sp.minWalks}
                                    </Text>
                                    <Text lineHeight={0.5}>
                                        ...more statistics later
                                    </Text>
                                </Stack>
                                
                            </Stack>
                        </Card.Body>
                        <Card.Footer justifyContent={"flex-end"}>
                            <Button variant="outline" px={2}><MdDelete />Delete</Button>
                            <Button px={2}><MdModeEdit />Edit</Button>
                        </Card.Footer>
                    </Card.Root>
                </GridItem>
            ))}
        </Grid>
    );
}