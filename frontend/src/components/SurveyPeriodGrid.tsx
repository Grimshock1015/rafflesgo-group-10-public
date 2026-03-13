import { RafflesGoService } from "@/api";
import { toaster } from "@/components/ui/toaster";
import { Badge, Button, Card, CloseButton, Dialog, Grid, GridItem, Portal, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { MdDelete, MdModeEdit } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import type { User } from 'firebase/auth';
import { MdGroupAdd } from "react-icons/md"; 

type SurveyPeriod = Awaited<ReturnType<typeof RafflesGoService.listSurveyPeriods>>["surveyPeriods"][number];

type DeleteSurveyPeriodButtonProps = {
    surveyPeriodId: string;
    onDeleted: () => Promise<void>;
};

type JoinSurveyPeriodButtonProps = {
    surveyPeriodId: string;
    volunteerUids: string[]; 
    onJoined: () => Promise<void>;
    user: User;
};

function DeleteSurveyPeriodButton({ surveyPeriodId, onDeleted }: DeleteSurveyPeriodButtonProps) {
    const [open, setOpen] = useState(false);

    const handleDelete = async () => {
        try {
            await RafflesGoService.deleteSurveyPeriod(surveyPeriodId);
            setOpen(false);
            await onDeleted();
        } catch (error) {
            console.error("Failed to delete survey period:", error);
            toaster.create({
                type: "error",
                title: "Delete failed",
                description: "Unable to delete survey period. Please try again.",
                closable: true,
            });
        }
    };

    return (
        <Dialog.Root size={"sm"} open={open} onOpenChange={(event) => setOpen(event.open)}>
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
                        <Dialog.Body color={"black"}>
                            Are you sure you want to delete this survey period? This action cannot be undone.
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Dialog.ActionTrigger asChild>
                                <Button variant="outline" px={2}>Cancel</Button>
                            </Dialog.ActionTrigger>
                            <Button px={2} onClick={handleDelete}>Delete</Button>
                        </Dialog.Footer>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton size="sm" />
                        </Dialog.CloseTrigger>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}

function JoinSurveyPeriodButton({ surveyPeriodId, volunteerUids, onJoined, user }: JoinSurveyPeriodButtonProps) {
    const [isJoining, setIsJoining] = useState(false);

    // Check if the current user has already joined this survey period
    const hasJoined = user ? volunteerUids.includes(user.uid) : false;

    const handleJoin = async () => {
        // User must be logged in to join (This is temporary, we need to change to only can join the survey after successfully verified by the admins)
        if (!user) return; 
        setIsJoining(true);
        try {
            await RafflesGoService.joinSurveyPeriod(surveyPeriodId, {
                volunteerUid: user.uid
            });
            
            toaster.create({
                type: "success",
                title: "Joined Successfully!",
                description: "You are now part of this survey period.",
                closable: true,
            });
            
            await onJoined(); 
        } catch (error) {
            console.error("Failed to join survey period:", error);
            toaster.create({
                type: "error",
                title: "Join failed",
                description: "Unable to join. Please try again.",
                closable: true,
            });
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <Button 
            px={2} 
            colorPalette="blue" 
            variant={hasJoined ? "outline" : "solid"}
            onClick={handleJoin}
            loading={isJoining}
            disabled={hasJoined || !user} // If user hasn't logged in or already joined, disable the button
        >
            <MdGroupAdd />
            {hasJoined ? "Joined" : "Join"}
        </Button>
    );
}

export default function SurveyPeriodGrid({ user }: { user: User }) {
    const [surveyPeriods, setSurveyPeriods] = useState<SurveyPeriod[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    
    const fetchSurveyPeriods = async () => {
        try {
            const response = await RafflesGoService.listSurveyPeriods();
            setSurveyPeriods(response.surveyPeriods);
        } catch (error) {
            console.error("Failed to fetch survey periods:", error);
            toaster.create({
                type: "error",
                title: "Fetch failed",
                description: "Unable to fetch survey periods. Please try again.",
                closable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

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
                            <DeleteSurveyPeriodButton surveyPeriodId={sp.uid} onDeleted={fetchSurveyPeriods} />
                            <Button px={2} onClick={() => navigate('/edit-survey-period/' + sp.uid)}><MdModeEdit />Edit</Button>
                            <JoinSurveyPeriodButton 
                                surveyPeriodId={sp.uid} 
                                volunteerUids={sp.volunteerUids || []} 
                                onJoined={fetchSurveyPeriods} 
                                user={user}
                            />
                        </Card.Footer>
                    </Card.Root>
                </GridItem>
            ))}
        </Grid>
    );
}