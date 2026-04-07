import { RafflesGoService } from "@/api";
import { toaster } from "@/components/ui/toaster";
import { Badge, Box, Button, Card, CloseButton, Container, Dialog, Grid, GridItem, IconButton, Portal, Select, Stack, Text, createListCollection } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { MdDelete, MdModeEdit } from "react-icons/md";
import { FaCheck } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import type { User } from 'firebase/auth';

type SurveyPeriod = Awaited<ReturnType<typeof RafflesGoService.listSurveyPeriods>>["surveyPeriods"][number];

type DeleteSurveyPeriodButtonProps = {
    surveyPeriodId: string;
    onDeleted: () => Promise<void>;
};

function DeleteSurveyPeriodButton({ surveyPeriodId, onDeleted }: DeleteSurveyPeriodButtonProps) {
    const [open, setOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            await RafflesGoService.deleteSurveyPeriod(surveyPeriodId);
            setOpen(false);
            await onDeleted();
            toaster.create({
                type: "success",
                title: "Deleted successfully!",
                description: "The survey period has been deleted.",
                closable: true,
            });
        } catch (error) {
            console.error("Failed to delete survey period:", error);
            toaster.create({
                type: "error",
                title: "Delete failed",
                description: "Unable to delete survey period. Please try again.",
                closable: true,
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog.Root size={"sm"} open={open} onOpenChange={(event) => setOpen(event.open)}>
            <Dialog.Trigger asChild>
                <Button variant="subtle" size={"sm"} px={2}>
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
                        <Dialog.Body color={"fg"}>
                            Are you sure you want to delete this survey period? This action cannot be undone.
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

export default function SurveyPeriodGrid({ user }: { user: User }) {
    const [surveyPeriods, setSurveyPeriods] = useState<SurveyPeriod[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSettingActiveUid, setIsSettingActiveUid] = useState<string | null>(null);
    const [activeSelectionUid, setActiveSelectionUid] = useState<string[]>([]);
    const [role, setRole] = useState<string>("user");

    const navigate = useNavigate();

    useEffect(() => {
        const fetchRole = async () => {
            try {
                const response = await RafflesGoService.getCurrentUser()
                setRole(response.role)
            } catch (error) {
                console.error('Failed to fetch current user role:', error)
                setRole('user')
            }
        }
        fetchRole();
    }, [user.uid]);
    
    const fetchSurveyPeriods = async () => {
        try {
            const response = await RafflesGoService.listSurveyPeriods();
            setSurveyPeriods(response.surveyPeriods);
            const activePeriod = response.surveyPeriods.find((period) => period.isActive);
            setActiveSelectionUid(activePeriod ? [activePeriod.uid] : []);
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

    const activePeriodCollection = useMemo(() => createListCollection({
        items: surveyPeriods.map((period) => ({
            value: period.uid,
            label: `${period.name}${period.isActive ? ' (Active)' : ''}`,
        })),
    }), [surveyPeriods]);

    const setActiveSurveyPeriod = async (surveyPeriodId: string) => {
        try {
            setIsSettingActiveUid(surveyPeriodId);
            await RafflesGoService.setActiveSurveyPeriod(surveyPeriodId);
            await fetchSurveyPeriods();
            toaster.create({
                type: "success",
                title: "Active survey period updated",
                description: "The selected survey period is now active.",
                closable: true,
            });
        } catch (error) {
            console.error("Failed to set active survey period:", error);
            toaster.create({
                type: "error",
                title: "Update failed",
                description: "Unable to set active survey period. Please try again.",
                closable: true,
            });
        } finally {
            setIsSettingActiveUid(null);
        }
    };

    useEffect(() => {
        fetchSurveyPeriods();
    }, []);

    if (isLoading) {
        return <Container centerContent mt={10}>
            <Text>Loading survey periods...</Text>
        </Container>;
    }

    if (surveyPeriods.length === 0) {
        return <Container centerContent mt={10}>
            <Text>No survey periods found.</Text>
        </Container>;
    }

    return (
        <>
            {role === "admin" && (
                <Box display="flex" alignItems="center" justifyContent="flex-start" gap={2} mt={3}>
                    <Select.Root
                        collection={activePeriodCollection}
                        value={activeSelectionUid}
                        onValueChange={(event) => setActiveSelectionUid(event.value)}
                        size="sm"
                        width="320px"
                    >
                        <Select.HiddenSelect />
                        <Select.Control>
                            <Select.Trigger px={3} py={2}>
                                <Select.ValueText placeholder="Choose active survey period" px={1}/>
                            </Select.Trigger>
                            <Select.IndicatorGroup pr={2}>
                                <Select.Indicator />
                            </Select.IndicatorGroup>
                        </Select.Control>
                        <Select.Positioner>
                            <Select.Content>
                                {activePeriodCollection.items.map((item) => (
                                    <Select.Item item={item} key={item.value} py={2} px={3}>
                                        {item.label}
                                        <Select.ItemIndicator />
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select.Positioner>
                    </Select.Root>
                    <IconButton
                        aria-label="Set active survey period"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const selectedUid = activeSelectionUid[0];
                            if (!selectedUid) return;
                            void setActiveSurveyPeriod(selectedUid);
                        }}
                        loading={isSettingActiveUid !== null}
                        disabled={!activeSelectionUid[0]}
                    >
                        <FaCheck />
                    </IconButton>
                </Box>
            )}

            <Grid templateColumns="repeat(auto-fill, minmax(320px, 1fr))" gap={4} mt={5}>
                {surveyPeriods.map((sp) => (
                    <GridItem key={sp.uid}>
                        <Card.Root h="100%" p={3}>
                            <Card.Body>
                                <Stack>
                                    <Stack direction="row" justify="space-between" align="flex-start">
                                        <Card.Title>{sp.name}</Card.Title>
                                        <Box display="flex" gap={1.5} alignItems="center" justifyContent="flex-end" ml="auto">
                                            {
                                                sp.isActive &&
                                                <Badge colorPalette="blue" p={1}>
                                                    Active
                                                </Badge>
                                            }
                                            {
                                                sp.isFinished &&
                                                <Badge colorPalette="green" p={1}>
                                                    Finished
                                                </Badge>
                                            }
                                            {
                                                !sp.isFinished &&
                                                <Badge colorPalette="orange" p={1}>
                                                    Ongoing
                                                </Badge>
                                            }
                                        </Box>
                                    </Stack>

                                    <Stack gap={0}>
                                        <Text lineHeight={0.5}>
                                            Start: {new Date(sp.startDate).toLocaleDateString("en-SG", { timeZone: "UTC" })}
                                        </Text>
                                        <Text lineHeight={0.5}>
                                            End: {new Date(sp.endDate).toLocaleDateString("en-SG", { timeZone: "UTC" })}
                                        </Text>
                                        <Text lineHeight={0.5}>
                                            Min. walks: {sp.minWalks}
                                        </Text>
                                    </Stack>
                                </Stack>
                            </Card.Body>
                            <Card.Footer justifyContent={"flex-end"} gap={2}>
                                {
                                    role === "admin" && (
                                        <>
                                            <DeleteSurveyPeriodButton surveyPeriodId={sp.uid} onDeleted={fetchSurveyPeriods} />
                                            <Button variant="subtle" size={"sm"} px={2} onClick={() => navigate('/edit-survey-period/' + sp.uid)}>
                                                <MdModeEdit />
                                                Edit
                                            </Button>
                                        </>
                                    )
                                }
                            </Card.Footer>
                        </Card.Root>
                    </GridItem>
                ))}
            </Grid>
        </>
    );
}