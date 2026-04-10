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
    const cardBg = effectiveTheme === "dark" ? "gray.900" : "white";
    const cardBorder = effectiveTheme === "dark" ? "whiteAlpha.300" : "gray.200";
    const cardShadow = effectiveTheme === "dark" ? "0 12px 28px rgba(0, 0, 0, 0.38)" : "sm";
    const cardTextColor = effectiveTheme === "dark" ? "whiteAlpha.900" : "gray.800";
    const cardSubtleTextColor = effectiveTheme === "dark" ? "whiteAlpha.800" : "gray.700";
    const outlineButtonColor = effectiveTheme === "dark" ? "gray.200" : "gray.700";
    const outlineButtonBorder = effectiveTheme === "dark" ? "whiteAlpha.300" : "gray.300";
    const outlineButtonHoverBg = effectiveTheme === "dark" ? "whiteAlpha.100" : "gray.100";

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
                <Card.Root h="100%" w="100%" p={0} overflow="hidden" display="flex" flexDirection="column" bg={cardBg} borderWidth="1px" borderColor={cardBorder} boxShadow={cardShadow}>
                    <Image
                        src="/assets/images/monkey.jpg"
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
                                <Box color={cardSubtleTextColor} display="flex" alignItems="center" gap={2} height={"8"} mb={1}>
                                    <Text as="span" color={cardSubtleTextColor}>Leader:</Text>
                                    {(sw.leader.name || sw.leader.uid) ? <PersonAvatar person={sw.leader} size="24px" /> : null}
                                    <Text as="span" color={cardSubtleTextColor}>{sw.leader.name || sw.leader.uid || "N/A"} {isLeader && "(You)"}</Text>
                                </Box>
                                <Text lineHeight={0.5} color={cardSubtleTextColor}>
                                    Contributes to: {sw.surveyPeriodName}
                                </Text>
                                <Collapsible.Content>
                                    <Box color={cardSubtleTextColor}>
                                        <Text mb={0}>Participants:</Text>
                                        <List.Root>
                                            {sw.volunteers.map((v) => (
                                                <PersonListItem key={v.uid} person={v} />
                                            ))}
                                        </List.Root>
                                    </Box>
                                    {sw.isFinished && (
                                        <>
                                            <Box mt={3} color={cardSubtleTextColor}>
                                                <Text mb={0}>Attended:</Text>
                                                <List.Root>
                                                    {sw.attendees.length === 0 ? <List.Item>None recorded</List.Item> : sw.attendees.map((v) => (
                                                        <PersonListItem key={v.uid} person={v} />
                                                    ))}
                                                </List.Root>
                                            </Box>
                                            <Box mt={3} color={cardSubtleTextColor}>
                                                <Text mb={0}>No-shows:</Text>
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
                            <Button
                                size={"sm"}
                                px={2}
                                variant="outline"
                                color={outlineButtonColor}
                                borderColor={outlineButtonBorder}
                                bg={open ? outlineButtonHoverBg : "transparent"}
                                _hover={{ bg: outlineButtonHoverBg }}
                                _active={{ bg: outlineButtonHoverBg }}
                                _expanded={{ bg: outlineButtonHoverBg }}
                            >
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
                            <MarkCompleteButton surveyWalk={sw} onJoin={onJoin} />
                        )}
                        {isLeader && (
                            <ReassignLeaderButton surveyWalkId={sw.uid} leaderUid={sw.leader.uid} volunteers={sw.volunteers} onDeleted={onJoin} />
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
