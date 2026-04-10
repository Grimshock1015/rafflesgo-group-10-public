import { RafflesGoService } from "@/api";
import { useTheme } from "@/contexts/ThemeContext";
import { toaster } from "@/components/ui/toaster";
import { Badge, Box, Button, Card, CloseButton, Container, Dialog, Grid, GridItem, IconButton, Image, Portal, Select, Stack, Text, createListCollection } from "@chakra-ui/react";
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
    const { effectiveTheme } = useTheme();
    const outlineButtonColor = effectiveTheme === "dark" ? "whiteAlpha.900" : "gray.700";
    const outlineButtonBorder = effectiveTheme === "dark" ? "whiteAlpha.500" : "gray.300";
    const outlineButtonHoverBg = effectiveTheme === "dark" ? "whiteAlpha.200" : "gray.100";

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
                <Button variant="outline" size={"sm"} px={2} color={outlineButtonColor} borderColor={outlineButtonBorder} _hover={{ bg: outlineButtonHoverBg }}>
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
                                <Button variant="outline" px={2} disabled={isDeleting} color={outlineButtonColor} borderColor={outlineButtonBorder} _hover={{ bg: outlineButtonHoverBg }}>
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
    const { effectiveTheme } = useTheme();
    
    const selectItemBg = effectiveTheme === "dark" ? "gray.800" : "white";
    const selectBorder = effectiveTheme === "dark" ? "gray.600" : "gray.200";
    const selectText = effectiveTheme === "dark" ? "whiteAlpha.900" : "gray.800";
    const selectPlaceholder = effectiveTheme === "dark" ? "whiteAlpha.700" : "gray.500";
    const selectItemHoverBg = effectiveTheme === "dark" ? "gray.700" : "gray.50";
    const cardBg = "var(--bg-card)";
    const cardBorder = "var(--border-color)";
    const cardShadow = effectiveTheme === "dark" ? "0 12px 28px rgba(0, 0, 0, 0.38)" : "sm";
    const cardTextColor = "var(--text-primary)";
    const cardSubtleTextColor = "var(--text-secondary)";
    const sectionInsetBg = "var(--bg-secondary)";
    const sectionInsetBorder = "var(--border-color-light)";
    const outlineButtonColor = effectiveTheme === "dark" ? "whiteAlpha.900" : "gray.700";
    const outlineButtonBorder = effectiveTheme === "dark" ? "whiteAlpha.500" : "gray.300";
    const outlineButtonHoverBg = effectiveTheme === "dark" ? "whiteAlpha.200" : "gray.100";
    const confirmButtonColor = effectiveTheme === "dark" ? "green.600" : "green.600";
    // const confirmButtonBorder = effectiveTheme === "dark" ? "whiteAlpha.300" : "gray.300";
    const confirmButtonHoverBg = effectiveTheme === "dark" ? "whiteAlpha.100" : "gray.100";

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
                        <Select.Label mb={0}>Select active survey period:</Select.Label>
                        <Select.Control>
                            <Select.Trigger px={3} py={2} bg={"transparent"} borderColor={selectBorder} color={selectText}>
                                <Select.ValueText placeholder="Select active survey period" px={1} color={activeSelectionUid[0] ? selectText : selectPlaceholder}/>
                            </Select.Trigger>
                            <Select.IndicatorGroup pr={2}>
                                <Select.Indicator color={selectText} />
                            </Select.IndicatorGroup>
                        </Select.Control>
                        <Select.Positioner>
                            <Select.Content backgroundColor={selectItemBg} borderColor={selectBorder} color={selectText}>
                                {activePeriodCollection.items.map((item) => (
                                    <Select.Item item={item} key={item.value} py={2} px={3} backgroundColor={selectItemBg} color={selectText} _highlighted={{ bg: selectItemHoverBg }}>
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
                        color={confirmButtonColor}
                        borderColor={selectBorder}
                        bg="transparent"
                        _hover={{ bg: confirmButtonHoverBg }}
                        _active={{ bg: confirmButtonHoverBg }}
                        onClick={() => {
                            const selectedUid = activeSelectionUid[0];
                            if (!selectedUid) return;
                            void setActiveSurveyPeriod(selectedUid);
                        }}
                        loading={isSettingActiveUid !== null}
                        disabled={!activeSelectionUid[0]}
                        alignSelf={"flex-end"}
                    >
                        <FaCheck />
                    </IconButton>
                </Box>
            )}

            <Grid templateColumns="repeat(auto-fill, minmax(320px, 1fr))" gap={4} mt={5}>
                {surveyPeriods.map((sp) => (
                    <GridItem key={sp.uid}>
                        <Card.Root h="100%" p={0} overflow="hidden" display="flex" flexDirection="column" bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderRadius="16px" boxShadow={cardShadow}>
                            <Image
                                src="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1874&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                                alt="Survey walk cover"
                                w="100%"
                                h="160px"
                                objectFit="cover"
                                objectPosition="center"
                                display="block"
                            />
                            <Card.Body p={5} pb={3} color={cardTextColor}>
                                <Stack gap={2}>
                                    <Stack direction="row" justify="space-between" align="flex-start">
                                        <Card.Title color={cardTextColor}>{sp.name}</Card.Title>
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

                                    <Box bg={sectionInsetBg} borderWidth="1px" borderColor={sectionInsetBorder} borderRadius="14px" px={4} py={5}>
                                        <Stack gap={5}>
                                            <Text lineHeight={0.75} color={cardSubtleTextColor} mb={0}>
                                                Start: {new Date(sp.startDate).toLocaleDateString("en-SG", { timeZone: "UTC" })}
                                            </Text>
                                            <Text lineHeight={0.75} color={cardSubtleTextColor} mb={0}>
                                                End: {new Date(sp.endDate).toLocaleDateString("en-SG", { timeZone: "UTC" })}
                                            </Text>
                                            <Text lineHeight={0.75} color={cardSubtleTextColor} mb={0}>
                                                Min. walks: {sp.minWalks}
                                            </Text>
                                        </Stack>
                                    </Box>
                                </Stack>
                            </Card.Body>
                            <Card.Footer justifyContent={"flex-end"} p={4} gap={1.5} flexWrap={"wrap"} flexShrink={0}>
                                {
                                    role === "admin" && (
                                        <>
                                            <DeleteSurveyPeriodButton surveyPeriodId={sp.uid} onDeleted={fetchSurveyPeriods} />
                                            <Button variant="outline" size={"sm"} px={2} color={outlineButtonColor} borderColor={outlineButtonBorder} _hover={{ bg: outlineButtonHoverBg }} onClick={() => navigate('/edit-survey-period/' + sp.uid)}>
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
