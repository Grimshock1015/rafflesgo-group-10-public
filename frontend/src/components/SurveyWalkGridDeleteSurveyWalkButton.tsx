import { RafflesGoService } from "@/api";
import { useTheme } from "@/contexts/ThemeContext";
import { Button, CloseButton, Dialog, Portal } from "@chakra-ui/react";
import { useState } from "react";
import { MdDelete } from "react-icons/md";

import { toaster } from "./ui/toaster";

type DeleteSurveyWalkButtonProps = {
    surveyWalkId: string;
    onDeleted: () => Promise<void>;
};

export function DeleteSurveyWalkButton({ surveyWalkId, onDeleted }: DeleteSurveyWalkButtonProps) {
    const [open, setOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { effectiveTheme } = useTheme();
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
                <Button variant="plain" size={"sm"} className="btn btn-secondary btn-compact">
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
                                <Button variant="plain" className="btn btn-secondary btn-compact" disabled={isDeleting}>
                                    Cancel
                                </Button>
                            </Dialog.ActionTrigger>
                            <Button variant="plain" className="btn btn-primary btn-compact" onClick={handleDelete} loading={isDeleting}>
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
