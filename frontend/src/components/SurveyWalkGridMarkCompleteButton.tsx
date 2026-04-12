import { RafflesGoService } from "@/api";
import { useTheme } from "@/contexts/ThemeContext";
import { Button, Checkbox, CloseButton, Dialog, Portal, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { MdDoneAll } from "react-icons/md";

import type { SurveyWalk } from "./SurveyWalkGrid.types";
import { toaster } from "./ui/toaster";

type MarkCompleteButtonProps = {
    surveyWalk: SurveyWalk;
    onJoin: () => void;
    isFinished?: boolean;
};

export function MarkCompleteButton({ surveyWalk, onJoin, isFinished }: MarkCompleteButtonProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const initialAttendeeUids = surveyWalk.attendeeUids ?? [];
    const [selectedAttendeeUids, setSelectedAttendeeUids] = useState<string[]>(initialAttendeeUids);
    const { effectiveTheme } = useTheme();
    const dialogBg = effectiveTheme === "dark" ? "gray.900" : "white";
    const dialogBorder = effectiveTheme === "dark" ? "whiteAlpha.300" : "gray.200";
    const dialogTextColor = effectiveTheme === "dark" ? "whiteAlpha.900" : "gray.800";
    const cardSubtleTextColor = effectiveTheme === "dark" ? "whiteAlpha.800" : "gray.700";

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
        <Dialog.Root size={"sm"} open={open} onOpenChange={(event) => setOpen(event.open)}>
            <Dialog.Trigger asChild>
                <Button size={"sm"} variant="plain" className="btn btn-secondary btn-compact" disabled={isFinished}>
                    <MdDoneAll />
                    {isFinished ? "Completed" : "Mark Complete"}
                </Button>
            </Dialog.Trigger>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner position="fixed" inset={0} display="flex" alignItems="center" justifyContent="center">
                    <Dialog.Content p={5} bg={dialogBg} borderWidth="1px" borderColor={dialogBorder} color={dialogTextColor}>
                        <Dialog.Header>
                            <Dialog.Title>Complete Survey Walk</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body color={"fg"}>
                            <Text color={cardSubtleTextColor} mb={3}>
                                Select the volunteers who actually attended in person.
                            </Text>
                            <Stack gap={3}>
                                {surveyWalk.volunteers.length === 0 ? (
                                    <Text color={cardSubtleTextColor}>
                                        No registered participants.
                                    </Text>
                                ) : (
                                    surveyWalk.volunteers.map((volunteer) => {
                                        const checked = selectedAttendeeUids.includes(volunteer.uid);
                                        return (
                                            <Checkbox.Root
                                                key={volunteer.uid}
                                                display={"flex"}
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
                                    variant="plain"
                                    className="btn btn-secondary btn-compact"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                            </Dialog.ActionTrigger>
                            <Button
                                variant="plain"
                                className="btn btn-primary btn-compact"
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
