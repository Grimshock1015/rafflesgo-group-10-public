import { RafflesGoService } from "@/api";
import { Badge, Button, Card, CloseButton, Dialog, Grid, GridItem, Portal, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { MdDelete, MdModeEdit } from "react-icons/md";
import { useNavigate } from "react-router-dom";

type SurveyPeriod = Awaited<ReturnType<typeof RafflesGoService.listSurveyPeriods>>["surveyPeriods"][number];

export default function SurveyPeriodGrid() {
    const [surveyPeriods, setSurveyPeriods] = useState<SurveyPeriod[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    
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

    const deleteButton = (surveyPeriodId: string) => {
        const handleDelete = async (id: string) => {
            try {
                await RafflesGoService.deleteSurveyPeriod(id);
                fetchSurveyPeriods();
            } catch (error) {
                console.error("Failed to delete survey period:", error);
            }
        }
        return (
            <Dialog.Root size={"sm"}>
            <Dialog.Trigger asChild>
              <Button variant="outline" size={"sm"} px={2}>
                <MdDelete />
                Delete
              </Button>
            </Dialog.Trigger>
            <Portal>
              <Dialog.Backdrop />
              <Dialog.Positioner position="fixed" inset={0} display="flex" alignItems="center" justifyContent="center">
                <Dialog.Content p={5}>
                  <Dialog.Header>
                    <Dialog.Title>Confirm Delete</Dialog.Title>
                  </Dialog.Header>
                  <Dialog.Body>
                    Are you sure you want to delete this survey period? This action cannot be undone.
                  </Dialog.Body>
                  <Dialog.Footer>
                    <Dialog.ActionTrigger asChild>
                      <Button variant="outline" px={2}>Cancel</Button>
                    </Dialog.ActionTrigger>
                    <Button px={2} onClick={() => handleDelete(surveyPeriodId)}>Delete</Button>
                  </Dialog.Footer>
                  <Dialog.CloseTrigger asChild >
                    <CloseButton size="sm" />
                  </Dialog.CloseTrigger>
                </Dialog.Content>
              </Dialog.Positioner>
            </Portal>
          </Dialog.Root>
        );
    }

    useEffect(() => {
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
                            {deleteButton(sp.uid)}
                            <Button px={2} onClick={() => navigate('/edit-survey-period/' + sp.uid)}><MdModeEdit />Edit</Button>
                        </Card.Footer>
                    </Card.Root>
                </GridItem>
            ))}
        </Grid>
    );
}