import { RafflesGoService } from "@/api";
import { Grid, GridItem, Stack, Badge, Text, Button, Card, Collapsible } from "@chakra-ui/react";
// import type { User } from "firebase/auth";
import { useEffect, useState } from "react";
import { MdGroupAdd } from "react-icons/md";
// import { useNavigate } from "react-router-dom";
import { FaEye } from "react-icons/fa";
import { FaEyeSlash } from "react-icons/fa6";
import { toaster } from "./ui/toaster";
import type { User } from "firebase/auth";

type SurveyWalk = Awaited<ReturnType<typeof RafflesGoService.listSurveyWalks>>["surveyWalks"][number];

function SurveyWalkCard({ sw, onJoin, user }: { sw: SurveyWalk; onJoin: () => void; user: User }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

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

    
    return (
        <GridItem key={sw.uid}>
            <Collapsible.Root open={open} onOpenChange={(event) => setOpen(event.open)}>   
            <Card.Root h="100%" p={3}>
                <Card.Body>
                    <Stack>
                        <Stack direction="row" justify="space-between" align="center">
                            <Card.Title>{sw.name}</Card.Title>
                            <Badge colorPalette={sw.isFinished ? "green" : "orange"} p={1}>
                                {sw.isFinished ? "Finished" : "Upcoming"}
                            </Badge>
                        </Stack>

                        <Stack gap={0}>
                            <Text lineHeight={0.5}>
                                Time: {new Date(sw.date).toLocaleDateString("en-SG", { timeZone: "UTC" })}, {sw.startTime} - {sw.endTime}
                            </Text>
                            <Text lineHeight={0.5}>
                                Volunteer no.: {sw.volunteers.length} / {sw.capacity}
                            </Text>
                            <Text lineHeight={0.5}>
                                Leader: {sw.leader.name || "N/A"}
                            </Text>
                            <Text lineHeight={0.5}>
                                Contributes to: {sw.surveyPeriodName}
                            </Text>
                                <Collapsible.Content>
                                    <Text>
                                        Volunteers: {sw.volunteers.map((v) => v.name).join(", ") || "None"}
                                    </Text>
                                </Collapsible.Content>
                        </Stack>
                    </Stack>
                </Card.Body>
                <Card.Footer justifyContent={"flex-end"}>
                    <Collapsible.Trigger asChild>
                        <Button size={"sm"} px={2}>
                            {open ? <><FaEyeSlash />Hide Details</> : <><FaEye /> View Details</>}
                        </Button>
                    </Collapsible.Trigger>
                    <Button 
                        size={"sm"} 
                        px={2} 
                        onClick={handleJoin} 
                        disabled={sw.isFinished || sw.volunteers.length >= sw.capacity || sw.volunteers.some(v => v.uid === user.uid)}
                        loading={isLoading}>
                        <MdGroupAdd />
                        {sw.volunteers.some(v => v.uid === user.uid) ? "Joined" : "Join"}
                    </Button>
                </Card.Footer>
            </Card.Root>
            </Collapsible.Root>
        </GridItem>
    );
}

export default function SurveyWalkGrid({user}: {user: User}) {
    const [surveyWalks, setSurveyWalks] = useState<SurveyWalk[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSurveyWalks = async () => {
        setIsLoading(true);
        try {
            const response = await RafflesGoService.listSurveyWalksForCurrentUser();
            setSurveyWalks(response.surveyWalks);
        } catch (error) {
            console.error("Failed to fetch survey walks:", error);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchSurveyWalks();
    }, []);
    
    return ( isLoading ? <Text>Loading survey walks...</Text> : surveyWalks.length === 0 ? <Text>No survey walks found.</Text> :
        <>
            Displaying survey walks for registered survey periods:
            <Grid templateColumns="repeat(auto-fill, minmax(320px, 1fr))" gap={4} mt={5}>
                {surveyWalks.map((sw) => (
                    <SurveyWalkCard key={sw.uid} sw={sw} onJoin={fetchSurveyWalks} user={user}/>
                ))}
            </Grid>
        </>
        
    );
}

