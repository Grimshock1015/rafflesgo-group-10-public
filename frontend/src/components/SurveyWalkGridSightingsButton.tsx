import { SightingsService } from "@/api";
import { useTheme } from "@/contexts/ThemeContext";
import { buildAdminSightingStats, listAdminSightingsForSurveyWalk, type AdminSighting } from "@/lib/adminSightings";
import { Box, Button, Card, CloseButton, Collapsible, Dialog, Grid, Image, Portal, Stack, Text } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { MdDelete, MdPhotoLibrary } from "react-icons/md";

import type { SurveyWalk } from "./SurveyWalkGrid.types";
import { formatTimestamp } from "./SurveyWalkGrid.utils";
import { toaster } from "./ui/toaster";

export function SurveyWalkSightingsButton({ surveyWalk }: { surveyWalk: SurveyWalk }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busySightingId, setBusySightingId] = useState<string | null>(null);
    const [sightings, setSightings] = useState<AdminSighting[]>([]);
    const [visibleCount, setVisibleCount] = useState(8);
    const { effectiveTheme } = useTheme();
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
                <Button variant="plain" size={"sm"} className="btn btn-secondary btn-compact">
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
                                                                        variant="plain"
                                                                        className="btn btn-secondary btn-compact"
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
                                                                                variant="plain"
                                                                                className="btn btn-secondary btn-compact"
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
                                                    variant="plain"
                                                    className="btn btn-secondary btn-compact"
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
