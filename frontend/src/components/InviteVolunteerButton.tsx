import { useState } from "react";
import { Button, Dialog, Portal, CloseButton, Input, Text } from "@chakra-ui/react";
import { MdPersonAdd } from "react-icons/md";
import { RafflesGoService } from "@/api";
import { toaster } from "@/components/ui/toaster";
import { useTheme } from "@/contexts/ThemeContext";

type InviteVolunteerButtonProps = {
    surveyWalkId: string;
};

export function InviteVolunteerButton({ surveyWalkId }: InviteVolunteerButtonProps) {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { effectiveTheme } = useTheme();

    const inputBg = effectiveTheme === "dark" ? "gray.800" : "white";
    const inputBorder = effectiveTheme === "dark" ? "gray.600" : "gray.200";

    const handleSend = async () => {
        if (!email.trim()) {
            toaster.create({
                type: "error",
                title: "Email required",
                description: "Please enter an email address.",
                closable: true,
            });
            return;
        }

        try {
            setIsLoading(true);
            await RafflesGoService.sendInvitation(surveyWalkId, { inviteeEmail: email.trim() });
            setOpen(false);
            setEmail('');
            toaster.create({
                type: "success",
                title: "Invitation sent!",
                description: `An invitation email has been sent to ${email.trim()}.`,
                closable: true,
            });
        } catch (error: unknown) {
            console.error("Failed to send invitation:", error);
            const status = (error as { status?: number })?.status;
            const description = status === 409
                ? "This email already has a pending invitation for this walk."
                : status === 400
                ? "Unable to send invitation. The walk may be full or already finished."
                : "Something went wrong. Please try again.";
            toaster.create({
                type: "error",
                title: "Failed to send invitation",
                description,
                closable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog.Root size="sm" open={open} onOpenChange={(event) => { setOpen(event.open); setEmail(''); }}>
            <Dialog.Trigger asChild>
                <Button variant="plain" size="sm" className="btn btn-secondary btn-compact">
                    <MdPersonAdd />
                    Invite
                </Button>
            </Dialog.Trigger>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner position="fixed" inset={0} display="flex" alignItems="center" justifyContent="center">
                    <Dialog.Content p={5}>
                        <Dialog.Header>
                            <Dialog.Title>Invite a Volunteer</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body color="fg">
                            <Text mb={3}>Enter the Gmail address of the volunteer you want to invite.</Text>
                            <Input
                                placeholder="volunteer@gmail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                bg={inputBg}
                                borderColor={inputBorder}
                                type="email"
                            />
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Dialog.ActionTrigger asChild>
                                <Button variant="plain" className="btn btn-secondary btn-compact" disabled={isLoading}>
                                    Cancel
                                </Button>
                            </Dialog.ActionTrigger>
                            <Button variant="plain" className="btn btn-primary btn-compact" onClick={handleSend} loading={isLoading}>
                                Send Invite
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