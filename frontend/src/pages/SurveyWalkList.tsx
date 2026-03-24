import SurveyWalkGrid from "@/components/SurveyWalkGrid";
import { Container } from "@chakra-ui/react";
import type { User } from "firebase/auth";

export default function SurveyWalkList({ user }: { user: User }) {
    return (
        <>
            <main className="main-content">
                <div className="container">
                <Container justifyContent={"space-between"} display={"flex"} alignItems={"center"} mt={5}>
                    <h1>
                    List of Survey Walks
                    </h1>
                </Container>
                <SurveyWalkGrid user={user} />
                </div>
            </main>
        </>
    );
}