import { RafflesGoService } from "@/api";
import { useTheme } from "@/contexts/ThemeContext";
import { Badge, Box, Button, Card, Collapsible, GridItem, Image, List, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { MdGroupAdd, MdGroupRemove, MdModeEdit } from "react-icons/md";
import type { User } from "firebase/auth";

import { InviteVolunteerButton } from "./InviteVolunteerButton";
import type { SurveyWalk } from "./SurveyWalkGrid.types";
import { PersonAvatar, PersonListItem } from "./SurveyWalkGridPeople";
import { DeleteSurveyWalkButton } from "./SurveyWalkGridDeleteSurveyWalkButton";
import { MarkCompleteButton } from "./SurveyWalkGridMarkCompleteButton";
import { ReassignLeaderButton } from "./SurveyWalkGridReassignLeaderButton";
import { SurveyWalkSightingsButton } from "./SurveyWalkGridSightingsButton";
import { toaster } from "./ui/toaster";

export function SurveyWalkCard({ sw, onJoin, user, role, onEdit }: { sw: SurveyWalk; onJoin: () => void; user: User; role: string; onEdit: (uid: string) => void }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const hasJoined = sw.volunteers.some((v) => v.uid === user.uid);
    const isFull = sw.volunteers.length >= sw.capacity;
    const isLeader = sw.leader.uid === user.uid;
    const { effectiveTheme } = useTheme();
    const cardBg = "var(--bg-card)";
    const cardBorder = "var(--border-color)";
    const cardShadow = effectiveTheme === "dark" ? "0 12px 28px rgba(0, 0, 0, 0.38)" : "sm";
    const cardTextColor = "var(--text-primary)";
    const cardSubtleTextColor = "var(--text-secondary)";
    const sectionInsetBg = "var(--bg-secondary)";
    const sectionInsetBorder = "var(--border-color-light)";
    const descriptionLineHeight = 0.75;

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
            });
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
            });
        }).finally(() => {
            setIsLoading(false);
        });
    }

    return (
        <GridItem key={sw.uid} h="100%">
            <Collapsible.Root open={open} onOpenChange={(event) => setOpen(event.open)} display="flex" flexDirection="column" h="100%">
                <Card.Root h="100%" w="100%" p={0} overflow="hidden" display="flex" flexDirection="column" bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderRadius="16px" boxShadow={cardShadow}>
                    <Image
                        src="/assets/images/monkey.jpg"
                        alt="Survey walk cover"
                        w="100%"
                        h="170px"
                        objectFit="cover"
                        objectPosition="center"
                        display="block"
                        flexShrink={0}
                    />
                    <Card.Body p={5} pb={3} flex="1" overflowY="auto" color={cardTextColor}>
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

                            <Stack gap={2}>
                                <Box bg={sectionInsetBg} borderWidth="1px" borderColor={sectionInsetBorder} borderRadius="14px" px={4} py={5}>
                                    <Stack gap={5}>
                                        <Text lineHeight={descriptionLineHeight} color={cardSubtleTextColor} mb={0}>
                                            Time: {new Date(sw.date).toLocaleDateString("en-SG", { timeZone: "UTC" })}, {sw.startTime} - {sw.endTime}
                                        </Text>
                                        <Text lineHeight={descriptionLineHeight} color={cardSubtleTextColor} mb={0}>
                                            Volunteer no.: {sw.volunteers.length} / {sw.capacity}
                                        </Text>
                                        <Text lineHeight={descriptionLineHeight} color={cardSubtleTextColor} mb={0}>
                                            Contributes to: {sw.surveyPeriodName}
                                        </Text>
                                        <Box color={cardSubtleTextColor} display="flex" alignItems="center" gap={2} height={"12px"} mb={1}>
                                            <Text as="span" lineHeight={descriptionLineHeight} color={cardSubtleTextColor}>Leader:</Text>
                                            {(sw.leader.name || sw.leader.uid) ? <PersonAvatar person={sw.leader} size="24px" /> : null}
                                            <Text as="span" lineHeight={descriptionLineHeight} color={cardSubtleTextColor}>{sw.leader.name || sw.leader.uid || "N/A"} {isLeader && "(You)"}</Text>
                                        </Box>
                                    </Stack>
                                </Box>
                                <Collapsible.Content>
                                    <Box color={cardSubtleTextColor} bg={sectionInsetBg} borderWidth="1px" borderColor={sectionInsetBorder} borderRadius="14px" px={4} py={3}>
                                        <Text mb={1}>Participants:</Text>
                                        <List.Root>
                                            {sw.volunteers.map((v) => (
                                                <PersonListItem key={v.uid} person={v} />
                                            ))}
                                        </List.Root>
                                    </Box>
                                    {sw.isFinished && (
                                        <>
                                            <Box mt={3} color={cardSubtleTextColor} bg={sectionInsetBg} borderWidth="1px" borderColor={sectionInsetBorder} borderRadius="14px" px={4} py={3}>
                                                <Text mb={1}>Attended:</Text>
                                                <List.Root>
                                                    {sw.attendees.length === 0 ? <List.Item>None recorded</List.Item> : sw.attendees.map((v) => (
                                                        <PersonListItem key={v.uid} person={v} />
                                                    ))}
                                                </List.Root>
                                            </Box>
                                            <Box mt={3} color={cardSubtleTextColor} bg={sectionInsetBg} borderWidth="1px" borderColor={sectionInsetBorder} borderRadius="14px" px={4} py={3}>
                                                <Text mb={1}>No-shows:</Text>
                                                <List.Root>
                                                    {sw.noShows.length === 0 ? <></> : sw.noShows.map((v) => (
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
                    <Card.Footer p={4} pt={2} flexShrink={0}>
                        <Stack w="100%" gap={2}>
                            <Box display="flex" justifyContent="flex-end" gap={1.5} flexWrap="wrap">
                                <Collapsible.Trigger asChild>
                                    <Button
                                        variant="plain"
                                        className="btn btn-secondary btn-compact"
                                    >
                                        {open ? <><FaEyeSlash />Hide Details</> : <><FaEye /> View Details</>}
                                    </Button>
                                </Collapsible.Trigger>
                                <Button
                                    variant="plain"
                                    className={hasJoined ? "btn btn-secondary btn-compact" : "btn btn-primary btn-compact"}
                                    onClick={hasJoined ? handleQuit : handleJoin}
                                    disabled={sw.isFinished || (isFull && !hasJoined)}
                                    loading={isLoading}
                                >
                                    {hasJoined ? <><MdGroupRemove /> Quit</> : <><MdGroupAdd /> Join</>}
                                </Button>
                                {!sw.isFinished && hasJoined && (
                                    <InviteVolunteerButton surveyWalkId={sw.uid} />
                                )}
                            </Box>

                            {isLeader && (
                                <Box display="flex" justifyContent="flex-end" gap={1.5} flexWrap="wrap">
                                    {isLeader && (
                                        <ReassignLeaderButton surveyWalkId={sw.uid} leaderUid={sw.leader.uid} volunteers={sw.volunteers} onDeleted={onJoin} />
                                    )}
                                    {isLeader && (
                                        <MarkCompleteButton surveyWalk={sw} onJoin={onJoin} isFinished={sw.isFinished} />
                                    )}
                                </Box>
                            )}

                            {role === "admin" && (
                                <Box display="flex" justifyContent="flex-end" gap={1.5} flexWrap="wrap">
                                    <SurveyWalkSightingsButton surveyWalk={sw} />
                                    <DeleteSurveyWalkButton surveyWalkId={sw.uid} onDeleted={async () => {
                                        onJoin();
                                    }} />
                                    <Button variant="plain" className="btn btn-secondary btn-compact" onClick={() => onEdit(sw.uid)}>
                                        <MdModeEdit />Edit
                                    </Button>
                                </Box>
                            )}
                        </Stack>
                    </Card.Footer>
                </Card.Root>
            </Collapsible.Root>
        </GridItem>
    );
}
