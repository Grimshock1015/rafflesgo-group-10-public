import { RafflesGoService } from "@/api";
import { useTheme } from "@/contexts/ThemeContext";
import { Grid, GridItem, Stack, Badge, Text, Button, Card, Collapsible, Image, Box, List, Dialog, Portal, CloseButton, Select, createListCollection, Checkbox } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { MdGroupAdd, MdGroupRemove } from "react-icons/md";
import { FaEye } from "react-icons/fa";
import { FaEyeSlash } from "react-icons/fa6";
import { toaster } from "./ui/toaster";
import type { User } from "firebase/auth";
import { BiTransfer } from "react-icons/bi";
import { MdDelete, MdModeEdit, MdDoneAll } from "react-icons/md";

type SurveyWalk = Awaited<ReturnType<typeof RafflesGoService.listSurveyWalks>>["surveyWalks"][number];

type DeleteSurveyWalkButtonProps = {
    surveyWalkId: string;
    onDeleted: () => Promise<void>;
};

function getWalkEndDateTime(surveyWalk: SurveyWalk) {
    const walkDate = new Date(surveyWalk.date);
    const [hours, minutes] = surveyWalk.endTime.split(":").map(Number);
    walkDate.setUTCHours(hours, minutes, 0, 0);
    return walkDate;
}

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

function SurveyWalkCard({ sw, onJoin, user, role, onEdit }: { sw: SurveyWalk; onJoin: () => void; user: User; role: string; onEdit: (uid: string) => void }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const hasJoined = sw.volunteers.some((v) => v.uid === user.uid);
    const isFull = sw.volunteers.length >= sw.capacity;
    const isLeader = sw.leader.uid === user.uid;
    const hasHappened = getWalkEndDateTime(sw).getTime() <= Date.now();
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
        const [selectedAttendeeUids, setSelectedAttendeeUids] = useState<string[]>(surveyWalk.attendeeUids);

        useEffect(() => {
            if (open) {
                setSelectedAttendeeUids(surveyWalk.attendeeUids);
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
                            <Text lineHeight={0.5} color={cardSubtleTextColor}>
                                Leader: {sw.leader.name || "N/A"} {isLeader && "(You)"}
                            </Text>
                            <Text lineHeight={0.5} color={cardSubtleTextColor}>
                                Contributes to: {sw.surveyPeriodName}
                            </Text>
                                <Collapsible.Content>
                                    <Box color={cardSubtleTextColor}>
                                        <Text>Participants:</Text>
                                        <List.Root>
                                            {sw.volunteers.map((v) => (
                                                <List.Item key={v.uid}>
                                                    {v.name}
                                                </List.Item>
                                            ))}
                                        </List.Root>
                                    </Box>
                                    {sw.isFinished && (
                                        <>
                                            <Box mt={3} color={cardSubtleTextColor}>
                                                <Text>Attended:</Text>
                                                <List.Root>
                                                    {sw.attendees.length === 0 ? <List.Item>None recorded</List.Item> : sw.attendees.map((v) => (
                                                        <List.Item key={v.uid}>
                                                            {v.name || v.uid}
                                                        </List.Item>
                                                    ))}
                                                </List.Root>
                                            </Box>
                                            <Box mt={3} color={cardSubtleTextColor}>
                                                <Text>No-shows:</Text>
                                                <List.Root>
                                                    {sw.noShows.length === 0 ? <List.Item>None</List.Item> : sw.noShows.map((v) => (
                                                        <List.Item key={v.uid}>
                                                            {v.name || v.uid}
                                                        </List.Item>
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
                    {isLeader && !sw.isFinished && hasHappened && (
                        <MarkCompleteButton surveyWalk={sw} />
                    )}
                    {isLeader && (
                        <ReassignLeaderButton surveyWalkId={sw.uid} volunteers={sw.volunteers} onDeleted={onJoin}></ReassignLeaderButton>
                    )}
                    <Box flexBasis="100%" height={0} />
                    {role === "admin" && (
                        <>
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
