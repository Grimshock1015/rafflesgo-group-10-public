// import { useState } from "react";
// import { Button } from "@chakra-ui/react";
// import { MdGroupAdd } from "react-icons/md";
// import type { User } from 'firebase/auth';
// import { RafflesGoService } from "@/api";
// import { toaster } from "@/components/ui/toaster";

// export type JoinSurveyPeriodButtonProps = {
//     surveyPeriodId: string;
//     volunteerUids: string[]; 
//     onJoined: () => Promise<void>;
//     user: User;
// };

// export function JoinSurveyPeriodButton({ surveyPeriodId, volunteerUids, onJoined, user }: JoinSurveyPeriodButtonProps) {
//     const [isProcessing, setIsProcessing] = useState(false);

//     // Check if the current user has already joined this survey period
//     const hasJoined = user ? volunteerUids.includes(user.uid) : false;

//     const handleToggle = async () => {
//         // User must be logged in to interact
//         if (!user) return; 
//         setIsProcessing(true);
//         try {
//             if (hasJoined) {
//                 await RafflesGoService.unjoinSurveyPeriod(surveyPeriodId, {
//                     volunteerUid: user.uid
//                 });
                
//                 toaster.create({
//                     type: "success",
//                     title: "Unjoined Successfully!",
//                     description: "You have left this survey period.",
//                     closable: true,
//                 });
//             } else {
//                 await RafflesGoService.joinSurveyPeriod(surveyPeriodId, {
//                     volunteerUid: user.uid
//                 });
                
//                 toaster.create({
//                     type: "success",
//                     title: "Joined Successfully!",
//                     description: "You are now part of this survey period.",
//                     closable: true,
//                 });
//             }
            
//             await onJoined(); 
//         } catch (error) {
//             console.error("Failed to toggle survey period status:", error);
//             toaster.create({
//                 type: "error",
//                 title: "Action failed",
//                 description: "Unable to process your request. Please try again.",
//                 closable: true,
//             });
//         } finally {
//             setIsProcessing(false);
//         }
//     };

//     return (
//         <Button 
//             px={2} 
//             size={"sm"}
//             colorPalette={hasJoined ? "red" : "blue"} 
//             variant={hasJoined ? "outline" : "solid"}
//             onClick={handleToggle}
//             loading={isProcessing}
//             disabled={!user} 
//         >
//             <MdGroupAdd />
//             {hasJoined ? "Unjoin" : "Join"}
//         </Button>
//     );
// }