import { RafflesGoService } from "@/api";
import { useTheme } from "@/contexts/ThemeContext";
import { Button, CloseButton, Dialog, Portal, Select, Text, createListCollection } from "@chakra-ui/react";
import { useState } from "react";
import { BiTransfer } from "react-icons/bi";

import type { WalkPerson } from "./SurveyWalkGrid.types";
import { toaster } from "./ui/toaster";

type ReassignLeaderButtonProps = {
    surveyWalkId: string;
    leaderUid: string;
    volunteers: WalkPerson[];
    onDeleted: () => void;
};

export function ReassignLeaderButton({ surveyWalkId, leaderUid, volunteers, onDeleted }: ReassignLeaderButtonProps) {
    const [open, setOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedParticipantUid, setSelectedParticipantUid] = useState<string[]>([]);
    const { effectiveTheme } = useTheme();
    const selectBg = effectiveTheme === "dark" ? "gray.800" : "white";
    const selectBorder = effectiveTheme === "dark" ? "gray.600" : "gray.200";
    const selectItemHoverBg = effectiveTheme === "dark" ? "gray.700" : "gray.50";
    const dialogBg = effectiveTheme === "dark" ? "gray.900" : "white";
    const dialogBorder = effectiveTheme === "dark" ? "whiteAlpha.300" : "gray.200";
    const dialogTextColor = effectiveTheme === "dark" ? "whiteAlpha.900" : "gray.800";
    const cardSubtleTextColor = effectiveTheme === "dark" ? "whiteAlpha.800" : "gray.700";
    const cardTextColor = effectiveTheme === "dark" ? "whiteAlpha.900" : "gray.800";

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
        items: volunteers.filter((volunteer) => volunteer.uid !== leaderUid).map((volunteer) => ({ value: volunteer.uid, label: volunteer.name })),
    });

    return (
        <Dialog.Root size={"sm"} open={open} onOpenChange={(event) => setOpen(event.open)}>
            <Dialog.Trigger asChild>
                <Button variant="plain" size={"sm"} className="btn btn-secondary btn-compact">
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
                            <Text mb={3} color={cardSubtleTextColor}>Assign a new leader for this survey walk.</Text>
                            <Select.Root collection={volunteersCollection} value={selectedParticipantUid} onValueChange={(event) => setSelectedParticipantUid(event.value)} size="sm" mb={5}>
                                <Select.HiddenSelect />
                                {/* <Select.Label color={cardSubtleTextColor}>Select participant</Select.Label> */}
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
                                <Button variant="plain" className="btn btn-secondary btn-compact" disabled={isDeleting}>
                                    Cancel
                                </Button>
                            </Dialog.ActionTrigger>
                            <Button variant="plain" className="btn btn-primary btn-compact" onClick={handleReassign} loading={isDeleting} disabled={!selectedParticipantUid.length}>
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
