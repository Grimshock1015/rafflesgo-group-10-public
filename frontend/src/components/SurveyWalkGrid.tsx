import { RafflesGoService, SightingsService } from "@/api";
import { useTheme } from "@/contexts/ThemeContext";
import { Grid, GridItem, Stack, Text, Button, Card, Collapsible, Image, Box, List, Dialog, Portal, CloseButton, Select, createListCollection, Checkbox, Badge } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { MdGroupAdd, MdGroupRemove } from "react-icons/md";
import { FaEye } from "react-icons/fa";
import { FaEyeSlash } from "react-icons/fa6";
import { toaster } from "./ui/toaster";
import type { User } from "firebase/auth";
import { BiTransfer } from "react-icons/bi";
import { MdDelete, MdModeEdit, MdDoneAll, MdPhotoLibrary } from "react-icons/md";
import { InviteVolunteerButton } from "./InviteVolunteerButton";
import { buildAdminSightingStats, listAdminSightingsForSurveyWalk, type AdminSighting } from "@/lib/adminSightings";

type SurveyWalk = Awaited<ReturnType<typeof RafflesGoService.listSurveyWalks>>["surveyWalks"][number];

type WalkPerson = SurveyWalk["leader"];

function formatTimestamp(value?: string) {
    if (!value) return "No submissions yet";

    return new Intl.DateTimeFormat("en-SG", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function PersonAvatar({ person, size = "28px" }: { person: WalkPerson; size?: string }) {
    const label = person.name || person.uid || "?";
    const initial = label.slice(0, 1).toUpperCase();

    if (person.photoURL) {
        return (
            <Image
                src={person.photoURL}
                alt={`${label} profile`}
                boxSize={size}
                borderRadius="full"
                objectFit="cover"
                flexShrink={0}
            />
        );
    }

    return (
        <Box
            aria-label={`${label} fallback avatar`}
            boxSize={size}
            borderRadius="full"
            bg="gray.500"
            color="white"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="xs"
            fontWeight="bold"
            flexShrink={0}
        >
            {initial}
        </Box>
    );
}

function PersonListItem({ person }: { person: WalkPerson }) {
    const label = person.name || person.uid;

    return (
        <List.Item key={person.uid} listStyleType="none">
            <Box display="flex" alignItems="center" gap={2}>
                <PersonAvatar person={person} />
                <Text>{label}</Text>
            </Box>
        </List.Item>
    );
}

type DeleteSurveyWalkButtonProps = {
    surveyWalkId: string;
    onDeleted: () => Promise<void>;
};

function DeleteSurveyWalkButton({ surveyWalkId, onDeleted }: DeleteSurveyWalkButtonProps) {
    const [open, setOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { effectiveTheme } = useTheme();
    const outlineButtonColor = effectiveTheme === "dark" ? "gray.200" : "gray.700";
    const outlineButtonBorder = effectiveTheme === "dark" ? "whiteAlpha.300" : "gray.300";
    const outlineButtonHoverBg = effectiveTheme === "dark" ? "whiteAlpha.100" : "gray.100";
    const dialogBg = effectiveTheme === "dark" ? "gray.900" : "white";
    const dialogBorder = effectiveTheme === "dark" ? "whiteAlpha.300" : "gray.200";
    const dialogTextColor = effectiveTheme === "dark" ? "whiteAlpha.900" : "gray.800";

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
                <Button variant="outline" size={"sm"} px={2} color={outlineButtonColor} borderColor={outlineButtonBorder} _hover={{ bg: outlineButtonHoverBg }}>
                    <MdDelete />
                    Delete
                </Button>
            </Dialog.Trigger>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner position="fixed" inset={0} display="flex" alignItems="center" justifyContent="center">
                    <Dialog.Content p={5} bg={dialogBg} borderWidth="1px" borderColor={dialogBorder} color={dialogTextColor}>
                        <Dialog.Header>
                            <Dialog.Title>Confirm Delete</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body color={"fg"}>
                            Are you sure you want to delete this survey walk? This action cannot be undone.
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

function SurveyWalkSightingsButton({ surveyWalk }: { surveyWalk: SurveyWalk }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busySightingId, setBusySightingId] = useState<string | null>(null);
    const [sightings, setSightings] = useState<AdminSighting[]>([]);
    const [visibleCount, setVisibleCount] = useState(8);
    const { effectiveTheme } = useTheme();
    const outlineButtonColor = effectiveTheme === "dark" ? "gray.200" : "gray.700";
    const outlineButtonBorder = effectiveTheme === "dark" ? "whiteAlpha.300" : "gray.300";
    const outlineButtonHoverBg = effectiveTheme === "dark" ? "whiteAlpha.100" : "gray.100";
    const dialogBg = effectiveTheme === "dark" ? "gray.900" : "white";
    const dialogBorder = effectiveTheme === "dark" ? "whiteAlpha.300" : "gray.200";
    const dialogTextColor = effectiveTheme === "dark" ? "whiteAlpha.900" : "gray.800";
    const subtleTextColor = effectiveTheme === "dark" ? "whiteAlpha.700" : "gray.600";
    const mutedCardBg = effectiveTheme === "dark" ? "whiteAlpha.100" : "gray.50";
    const chipBg = effectiveTheme === "dark" ? "whiteAlpha.200" : "gray.100";
    const chipTextColor = effectiveTheme === "dark" ? "whiteAlpha.900" : "gray.700";
    const detailBg = effectiveTheme === "dark" ? "whiteAlpha.100" : "white";
    const emphasisBg = effectiveTheme === "dark" ? "rgba(56, 161, 105, 0.18)" : "green.50";
    const emphasisTextColor = effectiveTheme === "dark" ? "green.100" : "green.800";
    const statBg = effectiveTheme === "dark" ? "rgba(255, 255, 255, 0.04)" : "white";
    const statBorder = effectiveTheme === "dark" ? "rgba(255, 255, 255, 0.08)" : "gray.200";
    const statValueColor = effectiveTheme === "dark" ? "white" : "gray.900";

    const stats = useMemo(() => buildAdminSightingStats(sightings), [sightings]);
    const topSpecies = stats.speciesBreakdown[0];
    const visibleSightings = useMemo(() => sightings.slice(0, visibleCount), [sightings, visibleCount]);
    const canShowMore = visibleCount < sightings.length;
    const participantNames = useMemo(() => {
        const names = new Map<string, string>();

        if (surveyWalk.leader.uid) {
            names.set(surveyWalk.leader.uid, surveyWalk.leader.name || surveyWalk.leader.uid);
        }

        for (const volunteer of surveyWalk.volunteers) {
            names.set(volunteer.uid, volunteer.name || volunteer.uid);
        }

        for (const attendee of surveyWalk.attendees) {
            names.set(attendee.uid, attendee.name || attendee.uid);
        }

        for (const noShow of surveyWalk.noShows) {
            names.set(noShow.uid, noShow.name || noShow.uid);
        }

        return names;
    }, [surveyWalk]);

    const resolveSubmitterLabel = (submittedBy: string) => participantNames.get(submittedBy) || submittedBy;

    const loadSightings = async () => {
        try {
            setIsLoading(true);
            setError(null);
            setVisibleCount(8);
            const response = await listAdminSightingsForSurveyWalk(surveyWalk.uid);
            setSightings(response.sightings);
        } catch (loadError) {
            console.error("Failed to load survey walk sightings:", loadError);
            setError("Unable to load sightings for this survey walk.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenChange = (details: { open: boolean }) => {
        setOpen(details.open);
        if (details.open) {
            void loadSightings();
        }
    };

    const handleDeleteSighting = async (sightingId: string) => {
        const confirmed = window.confirm("Delete this sighting permanently?");
        if (!confirmed) return;

        try {
            setBusySightingId(sightingId);
            await SightingsService.deleteSighting(sightingId);
            setSightings((current) => current.filter((sighting) => sighting.id !== sightingId));
            toaster.create({
                type: "success",
                title: "Sighting deleted",
                description: "The submission has been removed from this survey walk.",
                closable: true,
            });
        } catch (deleteError) {
            console.error("Failed to delete sighting:", deleteError);
            setError("Unable to delete sighting.");
            toaster.create({
                type: "error",
                title: "Delete failed",
                description: "Unable to delete sighting. Please try again.",
                closable: true,
            });
        } finally {
            setBusySightingId(null);
        }
    };

    return (
        <Dialog.Root size={"xl"} open={open} onOpenChange={handleOpenChange}>
            <Dialog.Trigger asChild>
                <Button variant="outline" size={"sm"} px={2} color={outlineButtonColor} borderColor={outlineButtonBorder} _hover={{ bg: outlineButtonHoverBg }}>
                    <MdPhotoLibrary />
                    View Sightings
                </Button>
            </Dialog.Trigger>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner position="fixed" inset={0} display="flex" alignItems="center" justifyContent="center">
                    <Dialog.Content
                        p={5}
                        bg={dialogBg}
                        borderWidth="1px"
                        borderColor={dialogBorder}
                        color={dialogTextColor}
                        maxW="960px"
                        maxH="85vh"
                        overflow="hidden"
                    >
                        <Dialog.Header>
                            <Dialog.Title>{surveyWalk.name} Sightings</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body color={"fg"} overflowY="auto">
                            <Text color={subtleTextColor} mb={4}>
                                Review all submissions for this survey walk, including images and roll-up stats.
                            </Text>
                            {error ? <Text color="red.400" mb={4}>{error}</Text> : null}
                            {isLoading ? (
                                <Text>Loading sightings...</Text>
                            ) : (
                                <Stack gap={5}>
                                    <Box>
                                        <Text color={subtleTextColor} mb={2}>Walk summary</Text>
                                        <Grid templateColumns="repeat(auto-fit, minmax(120px, 1fr))" gap={2}>
                                            <Box bg={statBg} border="1px solid" borderColor={statBorder} borderRadius="md" px={3} py={2}>
                                                <Text color={subtleTextColor} fontSize="xs" textTransform="uppercase" letterSpacing="0.04em">Submissions</Text>
                                                <Text color={statValueColor} fontSize="lg" fontWeight="bold" lineHeight="1.2">{stats.totalSubmissions}</Text>
                                            </Box>
                                            <Box bg={statBg} border="1px solid" borderColor={statBorder} borderRadius="md" px={3} py={2}>
                                                <Text color={subtleTextColor} fontSize="xs" textTransform="uppercase" letterSpacing="0.04em">Sighted</Text>
                                                <Text color={statValueColor} fontSize="lg" fontWeight="bold" lineHeight="1.2">{stats.sightedCount}</Text>
                                            </Box>
                                            <Box bg={statBg} border="1px solid" borderColor={statBorder} borderRadius="md" px={3} py={2}>
                                                <Text color={subtleTextColor} fontSize="xs" textTransform="uppercase" letterSpacing="0.04em">Not sighted</Text>
                                                <Text color={statValueColor} fontSize="lg" fontWeight="bold" lineHeight="1.2">{stats.notSightedCount}</Text>
                                            </Box>
                                            <Box bg={statBg} border="1px solid" borderColor={statBorder} borderRadius="md" px={3} py={2}>
                                                <Text color={subtleTextColor} fontSize="xs" textTransform="uppercase" letterSpacing="0.04em">Adults</Text>
                                                <Text color={statValueColor} fontSize="lg" fontWeight="bold" lineHeight="1.2">{stats.totalAdults}</Text>
                                            </Box>
                                            <Box bg={statBg} border="1px solid" borderColor={statBorder} borderRadius="md" px={3} py={2}>
                                                <Text color={subtleTextColor} fontSize="xs" textTransform="uppercase" letterSpacing="0.04em">Juveniles</Text>
                                                <Text color={statValueColor} fontSize="lg" fontWeight="bold" lineHeight="1.2">{stats.totalJuveniles}</Text>
                                            </Box>
                                            <Box bg={statBg} border="1px solid" borderColor={statBorder} borderRadius="md" px={3} py={2} minW="0">
                                                <Text color={subtleTextColor} fontSize="xs" textTransform="uppercase" letterSpacing="0.04em">Top species</Text>
                                                <Text color={statValueColor} fontSize="sm" fontWeight="semibold" lineHeight="1.3" truncate>
                                                    {topSpecies ? `${topSpecies.species} (${topSpecies.count})` : "None"}
                                                </Text>
                                            </Box>
                                        </Grid>
                                        <Text color={subtleTextColor} fontSize="sm" mt={2}>
                                            Latest submission: {formatTimestamp(stats.latestSubmissionAt)}
                                        </Text>
                                    </Box>

                                    {sightings.length === 0 ? (
                                        <Text>No sightings have been submitted for this survey walk yet.</Text>
                                    ) : (
                                        <Stack gap={4}>
                                            {visibleSightings.map((sighting) => {
                                                return (
                                                    <Collapsible.Root key={sighting.id}>
                                                        <Card.Root bg={mutedCardBg} borderWidth="1px" borderColor={dialogBorder}>
                                                            <Card.Body p={5}>
                                                                <Box display="flex" justifyContent="space-between" gap={5} flexWrap="wrap" alignItems="start">
                                                                    <Box flex="1" minW="240px">
                                                                        <Text fontSize="lg" fontWeight="semibold">
                                                                            {sighting.result === "sighted" ? (sighting.species || "Sighting recorded") : "Zero-sighting walk"}
                                                                        </Text>
                                                                        <Text mt={1}>{sighting.location}</Text>
                                                                        <Text color={subtleTextColor} mt={1}>
                                                                            Submitted by: {resolveSubmitterLabel(sighting.submittedBy)}
                                                                        </Text>
                                                                    </Box>
                                                                    <Box textAlign={{ base: "left", md: "right" }}>
                                                                        <Text>{sighting.date} at {sighting.time}</Text>
                                                                        <Text color={subtleTextColor}>{formatTimestamp(sighting.createdAt)}</Text>
                                                                    </Box>
                                                                </Box>

                                                                <Box display="flex" gap={2} flexWrap="wrap" mt={5}>
                                                                    <Box px={3} py={1.5} borderRadius="full" bg={sighting.result === "sighted" ? emphasisBg : chipBg} color={sighting.result === "sighted" ? emphasisTextColor : chipTextColor} fontSize="sm" fontWeight="medium">
                                                                        {sighting.result === "sighted" ? "Sighted" : "Not sighted"}
                                                                    </Box>
                                                                    {typeof sighting.adults === "number" ? (
                                                                        <Box px={3} py={1.5} borderRadius="full" bg={chipBg} color={chipTextColor} fontSize="sm" fontWeight="medium">
                                                                            Adults: {sighting.adults}
                                                                        </Box>
                                                                    ) : null}
                                                                    {typeof sighting.juveniles === "number" ? (
                                                                        <Box px={3} py={1.5} borderRadius="full" bg={chipBg} color={chipTextColor} fontSize="sm" fontWeight="medium">
                                                                            Juveniles: {sighting.juveniles}
                                                                        </Box>
                                                                    ) : null}
                                                                </Box>

                                                                <Collapsible.Trigger asChild>
                                                                    <Button
                                                                        mt={4}
                                                                        size="sm"
                                                                        variant="outline"
                                                                        color={outlineButtonColor}
                                                                        borderColor={outlineButtonBorder}
                                                                        _hover={{ bg: outlineButtonHoverBg }}
                                                                    >
                                                                        View details
                                                                    </Button>
                                                                </Collapsible.Trigger>

                                                                <Collapsible.Content>
                                                                    <Stack gap={4} mt={4}>
                                                                        {sighting.behaviour ? (
                                                                            <Box bg={detailBg} borderWidth="1px" borderColor={dialogBorder} borderRadius="md" p={4}>
                                                                                <Text fontSize="sm" color={subtleTextColor} mb={1}>Behaviour</Text>
                                                                                <Text whiteSpace="pre-wrap">{sighting.behaviour}</Text>
                                                                            </Box>
                                                                        ) : null}

                                                                        {sighting.notes ? (
                                                                            <Box bg={detailBg} borderWidth="1px" borderColor={dialogBorder} borderRadius="md" p={4}>
                                                                                <Text fontSize="sm" color={subtleTextColor} mb={1}>Notes</Text>
                                                                                <Text whiteSpace="pre-wrap">{sighting.notes}</Text>
                                                                            </Box>
                                                                        ) : null}

                                                                        {sighting.mediaUrl ? (
                                                                            <Box>
                                                                                <Image
                                                                                    src={sighting.mediaUrl}
                                                                                    alt={`${sighting.species || "Survey walk"} submission media`}
                                                                                    maxH="280px"
                                                                                    w="100%"
                                                                                    borderRadius="md"
                                                                                    objectFit="contain"
                                                                                    bg={detailBg}
                                                                                />
                                                                            </Box>
                                                                        ) : null}

                                                                        <Box>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                color={outlineButtonColor}
                                                                                borderColor={outlineButtonBorder}
                                                                                _hover={{ bg: outlineButtonHoverBg }}
                                                                                onClick={() => void handleDeleteSighting(sighting.id)}
                                                                                loading={busySightingId === sighting.id}
                                                                            >
                                                                                <MdDelete />
                                                                                Delete Sighting
                                                                            </Button>
                                                                        </Box>
                                                                    </Stack>
                                                                </Collapsible.Content>
                                                            </Card.Body>
                                                        </Card.Root>
                                                    </Collapsible.Root>
                                                );
                                            })}

                                            {canShowMore ? (
                                                <Button
                                                    alignSelf="center"
                                                    variant="outline"
                                                    color={outlineButtonColor}
                                                    borderColor={outlineButtonBorder}
                                                    _hover={{ bg: outlineButtonHoverBg }}
                                                    onClick={() => setVisibleCount((current) => current + 8)}
                                                >
                                                    Show more sightings
                                                </Button>
                                            ) : null}
                                        </Stack>
                                    )}
                                </Stack>
                            )}
                        </Dialog.Body>
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
    const { effectiveTheme } = useTheme();
    const selectBg = effectiveTheme === "dark" ? "gray.800" : "white";
    const selectBorder = effectiveTheme === "dark" ? "gray.600" : "gray.200";
    const selectItemHoverBg = effectiveTheme === "dark" ? "gray.700" : "gray.50";
    const cardBg = effectiveTheme === "dark" ? "gray.900" : "white";
    const cardBorder = effectiveTheme === "dark" ? "whiteAlpha.300" : "gray.200";
    const cardShadow = effectiveTheme === "dark" ? "0 12px 28px rgba(0, 0, 0, 0.38)" : "sm";
    const cardTextColor = effectiveTheme === "dark" ? "whiteAlpha.900" : "gray.800";
    const cardSubtleTextColor = effectiveTheme === "dark" ? "whiteAlpha.800" : "gray.700";
    const outlineButtonColor = effectiveTheme === "dark" ? "gray.200" : "gray.700";
    const outlineButtonBorder = effectiveTheme === "dark" ? "whiteAlpha.300" : "gray.300";
    const outlineButtonHoverBg = effectiveTheme === "dark" ? "whiteAlpha.100" : "gray.100";
    const dialogBg = effectiveTheme === "dark" ? "gray.900" : "white";
    const dialogBorder = effectiveTheme === "dark" ? "whiteAlpha.300" : "gray.200";
    const dialogTextColor = effectiveTheme === "dark" ? "whiteAlpha.900" : "gray.800";

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
                    <Button variant="outline" size={"sm"} px={2} color={outlineButtonColor} borderColor={outlineButtonBorder} _hover={{ bg: outlineButtonHoverBg }}>
                        <BiTransfer />
                        Reassign
                    </Button>
                </Dialog.Trigger>
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner position="fixed" inset={0} display="flex" alignItems="center" justifyContent="center">
                        <Dialog.Content p={5} bg={dialogBg} borderWidth="1px" borderColor={dialogBorder} color={dialogTextColor}>
                            <Dialog.Header>
                                <Dialog.Title>Reassign Leader</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body color={"fg"}>
                                <Select.Root collection={volunteersCollection} value={selectedParticipantUid} onValueChange={(e) => setSelectedParticipantUid(e.value)} size="sm" my={5}>
                                    <Select.HiddenSelect />
                                    <Select.Label color={cardSubtleTextColor}>Select participant</Select.Label>
                                    <Select.Control>
                                        <Select.Trigger px={3} bg={selectBg} borderColor={selectBorder} color={cardTextColor}>
                                        <Select.ValueText placeholder="Select participant" />
                                        </Select.Trigger>
                                        <Select.IndicatorGroup pr={2}>
                                        <Select.Indicator />
                                        </Select.IndicatorGroup>
                                    </Select.Control>
                                    <Portal>
                                        <Select.Positioner>
                                        <Select.Content bg={selectBg} borderColor={selectBorder} color={cardTextColor}>
                                            {volunteersCollection.items.map((volunteer) => (
                                            <Select.Item item={volunteer} key={volunteer.value} py={2} px={2} bg={selectBg} color={cardTextColor} _highlighted={{ bg: selectItemHoverBg }}>
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
                                    <Button variant="outline" px={2} disabled={isDeleting} color={outlineButtonColor} borderColor={outlineButtonBorder} _hover={{ bg: outlineButtonHoverBg }}>
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

    function MarkCompleteButton({ surveyWalk }: { surveyWalk: SurveyWalk }) {
        const [open, setOpen] = useState(false);
        const [isSubmitting, setIsSubmitting] = useState(false);
        const initialAttendeeUids = surveyWalk.attendeeUids ?? [];
        const [selectedAttendeeUids, setSelectedAttendeeUids] = useState<string[]>(initialAttendeeUids);

        useEffect(() => {
            if (open) {
                setSelectedAttendeeUids(surveyWalk.attendeeUids ?? []);
            }
        }, [open, surveyWalk.attendeeUids]);

        const toggleAttendee = (uid: string, checked: boolean) => {
            setSelectedAttendeeUids((current) => checked
                ? [...current, uid]
                : current.filter((currentUid) => currentUid !== uid));
        };

        const handleComplete = async () => {
            try {
                setIsSubmitting(true);
                await RafflesGoService.completeSurveyWalk(surveyWalk.uid, {
                    attendeeUids: selectedAttendeeUids,
                });
                setOpen(false);
                await onJoin();
                toaster.create({
                    type: "success",
                    title: "Walk marked complete",
                    description: "Attendance has been recorded for this survey walk.",
                    closable: true,
                });
            } catch (error) {
                console.error("Failed to complete survey walk:", error);
                toaster.create({
                    type: "error",
                    title: "Unable to save attendance",
                    description: "Please try again.",
                    closable: true,
                });
            } finally {
                setIsSubmitting(false);
            }
        };

        return (
          <Dialog.Root
            size={'sm'}
            open={open}
            onOpenChange={(event) => setOpen(event.open)}
          >
            <Dialog.Trigger asChild>
              <Button
                size={'sm'}
                px={2}
                variant="outline"
                color={outlineButtonColor}
                borderColor={outlineButtonBorder}
                _hover={{ bg: outlineButtonHoverBg }}
              >
                <MdDoneAll />
                Mark Complete
              </Button>
            </Dialog.Trigger>
            <Portal>
              <Dialog.Backdrop />
              <Dialog.Positioner
                position="fixed"
                inset={0}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Dialog.Content
                  p={5}
                  bg={dialogBg}
                  borderWidth="1px"
                  borderColor={dialogBorder}
                  color={dialogTextColor}
                >
                  <Dialog.Header>
                    <Dialog.Title>Complete Survey Walk</Dialog.Title>
                  </Dialog.Header>
                  <Dialog.Body color={'fg'}>
                    <Text color={cardSubtleTextColor}  mb={3}>
                      Select the volunteers who actually attended in person.
                    </Text>
                    <Stack gap={3}>
                      {surveyWalk.volunteers.length === 0 ? (
                        <Text color={cardSubtleTextColor}>
                          No registered participants.
                        </Text>
                      ) : (
                        surveyWalk.volunteers.map((volunteer) => {
                          const checked = selectedAttendeeUids.includes(
                            volunteer.uid,
                          );
                          return (
                            <Checkbox.Root
                              key={volunteer.uid}
                              display={'flex'}
                              checked={checked}
                              onCheckedChange={(event) =>
                                toggleAttendee(volunteer.uid, !!event.checked)
                              }
                              disabled={isSubmitting}
                            >
                              <Checkbox.HiddenInput />
                              <Checkbox.Control>
                                <Checkbox.Indicator />
                              </Checkbox.Control>
                              <Checkbox.Label>
                                {volunteer.name || volunteer.uid}
                              </Checkbox.Label>
                            </Checkbox.Root>
                          );
                        })
                      )}
                    </Stack>
                  </Dialog.Body>
                  <Dialog.Footer>
                    <Dialog.ActionTrigger asChild>
                      <Button
                        variant="outline"
                        px={2}
                        disabled={isSubmitting}
                        color={outlineButtonColor}
                        borderColor={outlineButtonBorder}
                        _hover={{ bg: outlineButtonHoverBg }}
                      >
                        Cancel
                      </Button>
                    </Dialog.ActionTrigger>
                    <Button
                      px={2}
                      onClick={handleComplete}
                      loading={isSubmitting}
                    >
                      Save Attendance
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
        <GridItem key={sw.uid} h="100%">
            <Collapsible.Root open={open} onOpenChange={(event) => setOpen(event.open)} display="flex" flexDirection="column" h="100%">   
            <Card.Root h="100%" w="100%" p={0} overflow="hidden" display="flex" flexDirection="column" bg={cardBg} borderWidth="1px" borderColor={cardBorder} boxShadow={cardShadow}>
                <Image
                    src="src/assets/monkey.jpg"
                    alt="Survey walk cover"
                    w="100%"
                    h="160px"
                    objectFit="cover"
                    objectPosition="center"
                    display="block"
                    flexShrink={0}
                />
                <Card.Body p={3} flex="1" overflowY="auto" color={cardTextColor}>
                    <Stack gap={2}>
                        <Stack direction="row" justify="space-between" align="flex-start">
                            <Card.Title color={cardTextColor}>{sw.name}</Card.Title>
                            <Box display="flex" gap={1.5} alignItems="center" justifyContent="flex-end" ml="auto" mt="1px">
                                <Badge colorPalette={sw.isFinished ? "green" : "orange"} p={1}>
                                    {sw.isFinished ? "Finished" : "Upcoming"}
                                </Badge>
                                {hasJoined &&
                                <Badge colorPalette={hasJoined ? "green" : "orange"} p={1}>
                                    Joined
                                </Badge>
                                }
                                {
                                    isFull && !hasJoined && 
                                    <Badge colorPalette="red" p={1}>
                                        Full
                                    </Badge>
                                }
                            </Box>
                            
                        </Stack>

                        <Stack gap={1}>
                            <Text lineHeight={0.5} color={cardSubtleTextColor}>
                                Time: {new Date(sw.date).toLocaleDateString("en-SG", { timeZone: "UTC" })}, {sw.startTime} - {sw.endTime}
                            </Text>
                            <Text lineHeight={0.5} color={cardSubtleTextColor}>
                                Volunteer no.: {sw.volunteers.length} / {sw.capacity}
                            </Text>
                            <Box lineHeight={0.5} color={cardSubtleTextColor} display="flex" alignItems="center" gap={2}>
                                <Text as="span" color={cardSubtleTextColor}>Leader:</Text>
                                {(sw.leader.name || sw.leader.uid) ? <PersonAvatar person={sw.leader} size="24px" /> : null}
                                <Text as="span" color={cardSubtleTextColor}>{sw.leader.name || sw.leader.uid || "N/A"} {isLeader && "(You)"}</Text>
                            </Box>
                            <Text lineHeight={0.5} color={cardSubtleTextColor}>
                                Contributes to: {sw.surveyPeriodName}
                            </Text>
                                <Collapsible.Content>
                                    <Box color={cardSubtleTextColor}>
                                        <Text>Participants:</Text>
                                        <List.Root>
                                            {sw.volunteers.map((v) => (
                                                <PersonListItem key={v.uid} person={v} />
                                            ))}
                                        </List.Root>
                                    </Box>
                                    {sw.isFinished && (
                                        <>
                                            <Box mt={3} color={cardSubtleTextColor}>
                                                <Text>Attended:</Text>
                                                <List.Root>
                                                    {sw.attendees.length === 0 ? <List.Item>None recorded</List.Item> : sw.attendees.map((v) => (
                                                        <PersonListItem key={v.uid} person={v} />
                                                    ))}
                                                </List.Root>
                                            </Box>
                                            <Box mt={3} color={cardSubtleTextColor}>
                                                <Text>No-shows:</Text>
                                                <List.Root>
                                                    {sw.noShows.length === 0 ? <List.Item>None</List.Item> : sw.noShows.map((v) => (
                                                        <PersonListItem key={v.uid} person={v} />
                                                    ))}
                                                </List.Root>
                                            </Box>
                                        </>
                                    )}
                                    
                                </Collapsible.Content>
                        </Stack>
                    </Stack>
                </Card.Body>
                <Card.Footer justifyContent={"flex-end"} p={3} pt={0} gap={1} flexWrap={"wrap"} flexShrink={0}>
                    <Collapsible.Trigger asChild>
                        <Button size={"sm"} px={2} variant="outline" color={outlineButtonColor} borderColor={outlineButtonBorder} _hover={{ bg: outlineButtonHoverBg }}>
                            {open ? <><FaEyeSlash />Hide Details</> : <><FaEye /> View Details</>}
                        </Button>
                    </Collapsible.Trigger>
                    <Button 
                        size={"sm"} 
                        px={2} 
                        onClick={hasJoined ? handleQuit : handleJoin}
                        disabled={sw.isFinished || (isFull && !hasJoined)}
                        loading={isLoading}
                        variant="outline"
                        color={outlineButtonColor}
                        borderColor={outlineButtonBorder}
                        _hover={{ bg: outlineButtonHoverBg }}
                    >
                        {hasJoined ? <><MdGroupRemove /> Quit</> : <><MdGroupAdd /> Join</>}
                    </Button>
                    {!sw.isFinished && (
                        <InviteVolunteerButton surveyWalkId={sw.uid} />
                    )}
                    {isLeader && !sw.isFinished && (
                        <MarkCompleteButton surveyWalk={sw} />
                    )}
                    {isLeader && (
                        <ReassignLeaderButton surveyWalkId={sw.uid} volunteers={sw.volunteers} onDeleted={onJoin}></ReassignLeaderButton>
                    )}
                    <Box flexBasis="100%" height={0} />
                    {role === "admin" && (
                        <>
                            <SurveyWalkSightingsButton surveyWalk={sw} />
                            <DeleteSurveyWalkButton surveyWalkId={sw.uid} onDeleted={async () => {
                                onJoin();
                            }} />
                            <Button size={"sm"} px={2} variant="outline" color={outlineButtonColor} borderColor={outlineButtonBorder} _hover={{ bg: outlineButtonHoverBg }} onClick={() => onEdit(sw.uid)}>
                                <MdModeEdit />Edit
                            </Button>
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
    const [onlyActive, setOnlyActive] = useState(true);
    const [role, setRole] = useState<'user' | 'admin'>('user');
    const [adminWalkScope, setAdminWalkScope] = useState<string[]>(["joined"]);
    const { effectiveTheme } = useTheme();
    const selectBg = effectiveTheme === "dark" ? "gray.800" : "white";
    const selectBorder = effectiveTheme === "dark" ? "gray.600" : "gray.200";
    const selectItemHoverBg = effectiveTheme === "dark" ? "gray.700" : "gray.50";

    const adminWalkScopeCollection = useMemo(() => createListCollection({
        items: [
            { value: "joined", label: "Only active survey walks" },
            { value: "all", label: "All survey walks" },
        ],
    }), []);

    useEffect(() => {
    let isMounted = true

    const fetchRole = async () => {
      try {
        const response = await RafflesGoService.getCurrentUser()
        if (isMounted) {
          setRole(response.role)
        }
      } catch {
        if (isMounted) {
          setRole('user')
        }
      }
    }

    fetchRole()

    return () => {
      isMounted = false
    }
  }, [user.uid])
    const fetchSurveyWalks = async (options?: { initial?: boolean, onlyActive?: boolean }) => {
        const isInitial = options?.initial === true;
        if (isInitial) {
            setIsInitialLoading(true);
        } else {
            setIsRefreshing(true);
        }

        try {
            const useOnlyActive = options?.onlyActive ?? true;
            if (role === "admin" && !useOnlyActive) {
                const response = await RafflesGoService.listSurveyWalks();
                response.surveyWalks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                setSurveyWalks(response.surveyWalks);
                setOnlyActive(false);
            } else {
                const response = await RafflesGoService.listSurveyWalksForCurrentUser();
                response.surveyWalks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                setSurveyWalks(response.surveyWalks);
                setOnlyActive(true);
            }
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
        fetchSurveyWalks({ initial: true, onlyActive: true });
    }, [role]);

    const refreshSurveyWalks = () => {
        void fetchSurveyWalks({ onlyActive });
    };
    
    return ( isInitialLoading ? <Text>Loading survey walks...</Text> : surveyWalks.length === 0 ? <Text>No survey walks found.</Text> :
        <>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={0}>
                <Text mb={0}>{role === "admin" && !onlyActive ? "Displaying all survey walks:" : "Displaying survey walks for registered survey periods:"}</Text>
                {isRefreshing && <Text fontSize="sm" color="gray.500">Refreshing...</Text>}
            </Box>
            {
                role == "admin" && (
                    <Select.Root
                        collection={adminWalkScopeCollection}
                        value={adminWalkScope}
                        onValueChange={(event) => {
                            setAdminWalkScope(event.value);
                            const selected = event.value[0] ?? "joined";
                            void fetchSurveyWalks({ initial: true, onlyActive: selected === "joined" });
                        }}
                        size="sm"
                        width="320px"
                        mb={5}
                    >
                        <Select.HiddenSelect />
                        <Select.Label />

                        <Select.Control>
                            <Select.Trigger px={3} py={2} bg={selectBg} borderColor={selectBorder}>
                            <Select.ValueText px={1} />
                            </Select.Trigger>
                            <Select.IndicatorGroup pr={2}>
                            <Select.Indicator />
                            </Select.IndicatorGroup>
                        </Select.Control>

                        <Select.Positioner>
                            <Select.Content bg={selectBg} borderColor={selectBorder}>
                                {adminWalkScopeCollection.items.map((item) => (
                                    <Select.Item item={item} key={item.value} py={2.5} px={3} bg={selectBg} _highlighted={{ bg: selectItemHoverBg }}>
                                        {item.label}
                                        <Select.ItemIndicator />
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select.Positioner>
                    </Select.Root>
                )
            }
            <Grid templateColumns="repeat(auto-fill, minmax(320px, 1fr))" gridAutoRows="1fr" gap={4} mt={3}>
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
