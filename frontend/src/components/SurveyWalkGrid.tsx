import { RafflesGoService } from "@/api";
import { Grid, GridItem, Stack, Badge, Text, Button, Card, Collapsible, Box, List, Dialog, Portal, CloseButton, Select, createListCollection } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { MdGroupAdd, MdGroupRemove } from "react-icons/md";
import { FaEye } from "react-icons/fa";
import { FaEyeSlash } from "react-icons/fa6";
import { toaster } from "./ui/toaster";
import type { User } from "firebase/auth";
import { BiTransfer } from "react-icons/bi";
import { MdDelete, MdModeEdit } from "react-icons/md";

type SurveyWalk = Awaited<ReturnType<typeof RafflesGoService.listSurveyWalks>>["surveyWalks"][number];

type DeleteSurveyWalkButtonProps = {
    surveyWalkId: string;
    onDeleted: () => Promise<void>;
};

function DeleteSurveyWalkButton({ surveyWalkId, onDeleted }: DeleteSurveyWalkButtonProps) {
    const [open, setOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            await RafflesGoService.deleteSurveyWalk(surveyWalkId);
            setOpen(false);
            await onDeleted();
            toaster.create({
                type: "success",
                title: "Deleted successfully!",
                description: "The survey walk has been deleted.",
                closable: true,
            });
        } catch (error) {
            console.error("Failed to delete survey walk:", error);
            toaster.create({
                type: "error",
                title: "Delete failed",
                description: "Unable to delete survey walk. Please try again.",
                closable: true,
            });
        } finally {
            setIsDeleting(false);
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
                            Are you sure you want to delete this survey walk? This action cannot be undone.
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Dialog.ActionTrigger asChild>
                                <Button variant="outline" px={2} disabled={isDeleting}>
                                    Cancel
                                </Button>
                            </Dialog.ActionTrigger>
                            <Button px={2} onClick={handleDelete} loading={isDeleting}>
                                Delete
                            </Button>
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

function SurveyWalkCard({ sw, onJoin, user, role, onEdit }: { sw: SurveyWalk; onJoin: () => void; user: User; role: string; onEdit: (uid: string) => void }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const hasJoined = sw.volunteers.some((v) => v.uid === user.uid);
    const isFull = sw.volunteers.length >= sw.capacity;
    const isLeader = sw.leader.uid === user.uid;

    function handleJoin() {
        setIsLoading(true);
        RafflesGoService.joinSurveyWalk(sw.uid).then(() => {
            toaster.create({
                type: "success",
                title: "Joined successfully!",
                description: "You have joined the survey walk.",
                closable: true,
            });
            onJoin();
        }).catch((error) => {
            console.error("Failed to join survey walk:", error);
            toaster.create({
                type: "error",
                title: "Join failed",
                description: "Unable to join. Please try again.",
                closable: true,
            })
        }).finally(() => {
            setIsLoading(false);
        });
    }

    function handleQuit() {
        setIsLoading(true);
        RafflesGoService.quitSurveyWalk(sw.uid).then(() => {
            toaster.create({
                type: "success",
                title: "Quit successfully!",
                description: "You have quit the survey walk.",
                closable: true,
            });
            onJoin();
        }).catch((error) => {
            console.error("Failed to quit survey walk:", error);
            toaster.create({
                type: "error",
                title: "Quit failed",
                description: "Unable to quit. Please try again.",
                closable: true,
            })
        }).finally(() => {
            setIsLoading(false);
        });
    }

    function ReassignLeaderButton({ surveyWalkId, volunteers, onDeleted }: { surveyWalkId: string; volunteers: { uid: string; name: string }[]; onDeleted: () => void }) {
        const [open, setOpen] = useState(false);
        const [isDeleting, setIsDeleting] = useState(false);
        const [selectedParticipantUid, setSelectedParticipantUid] = useState<string[]>([]);

        const handleReassign = async () => {
            const newLeaderUid = selectedParticipantUid[0];
            if (!newLeaderUid) {
                toaster.create({
                    type: "error",
                    title: "No participant selected",
                    description: "Please select a participant to reassign as leader.",
                    closable: true,
                });
                return;
            }

            try {
                setIsDeleting(true);
                await RafflesGoService.reassignSurveyWalkLeader(surveyWalkId, { newLeaderUid });
                setOpen(false);
                await onDeleted();
                toaster.create({
                    type: "success",
                    title: "Leader reassigned successfully!",
                    description: "The survey walk leader has been reassigned.",
                    closable: true,
                });
            } catch (error) {
                console.error("Failed to reassign survey walk leader:", error);
                toaster.create({
                    type: "error",
                    title: "Reassignment failed",
                    description: "Unable to reassign survey walk leader. Please try again.",
                    closable: true,
                });
            } finally {
                setIsDeleting(false);
            }
        };

        const volunteersCollection = createListCollection({
            items: volunteers.filter(v => v.uid !== sw.leader.uid).map(v => ({ value: v.uid, label: v.name }))
        });

        return (
            <Dialog.Root size={"sm"} open={open} onOpenChange={(event) => setOpen(event.open)}>
                <Dialog.Trigger asChild>
                    <Button variant="outline" size={"sm"} px={2}>
                        <BiTransfer />
                        Reassign
                    </Button>
                </Dialog.Trigger>
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner position="fixed" inset={0} display="flex" alignItems="center" justifyContent="center">
                        <Dialog.Content p={5}>
                            <Dialog.Header>
                                <Dialog.Title>Reassign Leader</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body color={"black"}>
                                <Select.Root collection={volunteersCollection} value={selectedParticipantUid} onValueChange={(e) => setSelectedParticipantUid(e.value)} size="sm" my={5}>
                                    <Select.HiddenSelect />
                                    <Select.Label>Select participant</Select.Label>
                                    <Select.Control>
                                        <Select.Trigger px={3}>
                                        <Select.ValueText placeholder="Select participant" />
                                        </Select.Trigger>
                                        <Select.IndicatorGroup>
                                        <Select.Indicator />
                                        </Select.IndicatorGroup>
                                    </Select.Control>
                                    <Portal>
                                        <Select.Positioner>
                                        <Select.Content>
                                            {volunteersCollection.items.map((volunteer) => (
                                            <Select.Item item={volunteer} key={volunteer.value} py={2} px={2}>
                                                {volunteer.label}
                                                <Select.ItemIndicator />
                                            </Select.Item>
                                            ))}
                                        </Select.Content>
                                        </Select.Positioner>
                                    </Portal>
                                </Select.Root>
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Dialog.ActionTrigger asChild>
                                    <Button variant="outline" px={2} disabled={isDeleting}>
                                        Cancel
                                    </Button>
                                </Dialog.ActionTrigger>
                                <Button px={2} onClick={handleReassign} loading={isDeleting} disabled={!selectedParticipantUid.length}>
                                    Reassign Leader
                                </Button>
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
    
    return (
        <GridItem key={sw.uid}>
            <Collapsible.Root open={open} onOpenChange={(event) => setOpen(event.open)}>   
            <Card.Root h="100%" p={3}>
                <Card.Body>
                    <Stack>
                        <Stack direction="row" justify="space-between" align="center">
                            <Card.Title>{sw.name}</Card.Title>
                            <Box display="flex" gap={2}>
                                <Badge colorPalette={sw.isFinished ? "green" : "orange"} p={1}>
                                    {sw.isFinished ? "Finished" : "Upcoming"}
                                </Badge>
                                {hasJoined &&
                                <Badge colorPalette={hasJoined ? "green" : "orange"} p={1}>
                                    Joined
                                </Badge>
                                }
                            </Box>
                            
                        </Stack>

                        <Stack gap={0}>
                            <Text lineHeight={0.5}>
                                Time: {new Date(sw.date).toLocaleDateString("en-SG", { timeZone: "UTC" })}, {sw.startTime} - {sw.endTime}
                            </Text>
                            <Text lineHeight={0.5}>
                                Volunteer no.: {sw.volunteers.length} / {sw.capacity}
                            </Text>
                            <Text lineHeight={0.5}>
                                Leader: {sw.leader.name || "N/A"} {isLeader && "(You)"}
                            </Text>
                            <Text lineHeight={0.5}>
                                Contributes to: {sw.surveyPeriodName}
                            </Text>
                                <Collapsible.Content>
                                    <Text>
                                        Participants:
                                        <List.Root>
                                            {sw.volunteers.map((v) => (
                                                <List.Item key={v.uid}>
                                                    {v.name}
                                                </List.Item>
                                            ))}
                                        </List.Root>
                                    </Text>
                                    
                                </Collapsible.Content>
                        </Stack>
                    </Stack>
                </Card.Body>
                <Card.Footer justifyContent={"flex-end"}>
                    {role === "admin" ? (
                        <>
                            <DeleteSurveyWalkButton surveyWalkId={sw.uid} onDeleted={async () => {
                                onJoin();
                            }} />
                            <Button size={"sm"} px={2} onClick={() => onEdit(sw.uid)}><MdModeEdit />Edit</Button>
                        </>
                    ) : (
                        <>
                            <Collapsible.Trigger asChild>
                                <Button size={"sm"} px={2}>
                                    {open ? <><FaEyeSlash />Hide Details</> : <><FaEye /> View Details</>}
                                </Button>
                            </Collapsible.Trigger>
                            <Button 
                                size={"sm"} 
                                px={2} 
                                onClick={hasJoined ? handleQuit : handleJoin}
                                disabled={sw.isFinished || (isFull && !hasJoined)}
                                loading={isLoading}>
                                {hasJoined ? <><MdGroupRemove /> Quit</> : <><MdGroupAdd /> Join</>}
                            </Button>
                            {isLeader && (
                                <ReassignLeaderButton surveyWalkId={sw.uid} volunteers={sw.volunteers} onDeleted={onJoin}></ReassignLeaderButton>
                            )}
                        </>
                    )}
                </Card.Footer>
            </Card.Root>
            </Collapsible.Root>
        </GridItem>
    );
}



export default function SurveyWalkGrid({user}: {user: User}) {
    const [surveyWalks, setSurveyWalks] = useState<SurveyWalk[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [role, setRole] = useState<string>("user");

    const fetchSurveyWalks = async (options?: { initial?: boolean }) => {
        const isInitial = options?.initial === true;
        if (isInitial) {
            setIsInitialLoading(true);
        } else {
            setIsRefreshing(true);
        }

        try {
            const response = role === "admin"
                ? await RafflesGoService.listSurveyWalks()
                : await RafflesGoService.listSurveyWalksForCurrentUser();
            setSurveyWalks(response.surveyWalks);
        } catch (error) {
            console.error("Failed to fetch survey walks:", error);
        } finally {
            if (isInitial) {
                setIsInitialLoading(false);
            } else {
                setIsRefreshing(false);
            }
        }
    }

    useEffect(() => {
        const fetchRole = async () => {
            try {
                const response = await RafflesGoService.getCurrentUser();
                setRole(response.role);
            } catch (error) {
                console.error("Failed to fetch current user role:", error);
                setRole("user");
            }
        };

        fetchRole();
    }, [user.uid]);

    useEffect(() => {
        fetchSurveyWalks({ initial: true });
    }, [role]);

    const refreshSurveyWalks = () => {
        void fetchSurveyWalks();
    };
    
    return ( isInitialLoading ? <Text>Loading survey walks...</Text> : surveyWalks.length === 0 ? <Text>No survey walks found.</Text> :
        <>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Text>{role === "admin" ? "Displaying all survey walks:" : "Displaying survey walks for registered survey periods:"}</Text>
                {isRefreshing && <Text fontSize="sm" color="gray.500">Refreshing...</Text>}
            </Box>
            <Grid templateColumns="repeat(auto-fill, minmax(320px, 1fr))" gap={4} mt={5}>
                {surveyWalks.map((sw) => (
                    <SurveyWalkCard
                        key={sw.uid}
                        sw={sw}
                        onJoin={refreshSurveyWalks}
                        user={user}
                        role={role}
                        onEdit={(uid) => {
                            window.location.assign('/edit-survey-walk/' + uid);
                        }}
                    />
                ))}
            </Grid>
        </>
        
    );
}

