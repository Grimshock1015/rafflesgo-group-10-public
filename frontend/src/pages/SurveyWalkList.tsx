import SurveyWalkGrid from "@/components/SurveyWalkGrid";
import { Button, Container } from "@chakra-ui/react";
import type { User } from "firebase/auth";
import { IoMdAdd } from "react-icons/io";
import { useEffect, useState } from "react";
import { RafflesGoService } from "@/api";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";

export default function SurveyWalkList({ user }: { user: User }) {
    const [role, setRole] = useState<string>("user");
    const navigate = useNavigate();
    const { effectiveTheme } = useTheme();
    const outlineButtonColor = effectiveTheme === "dark" ? "gray.200" : "gray.700";
    const outlineButtonBorder = effectiveTheme === "dark" ? "whiteAlpha.300" : "gray.300";
    const outlineButtonHoverBg = effectiveTheme === "dark" ? "whiteAlpha.100" : "gray.100";

    useEffect(() => {
        const fetchRole = async () => {
            try {
                const response = await RafflesGoService.getCurrentUser();
                setRole(response.role);
            } catch (error) {
                console.error("Failed to fetch current user role:", error);
                setRole("user");
            }
        };

        fetchRole();
    }, [user.uid]);

    return (
        <>
            <main className="main-content">
                <div className="container">
                <Container justifyContent={"space-between"} display={"flex"} alignItems={"center"} mt={5}>
                    <h1>
                    List of Survey Walks
                    </h1>
                    {
                        role === "admin" 
                        ? <Button
                            px={3}
                            variant="outline"
                            color={outlineButtonColor}
                            borderColor={outlineButtonBorder}
                            _hover={{ bg: outlineButtonHoverBg }}
                            onClick={() => navigate('/create-survey-walk')}>
                                Create New
                                <IoMdAdd/>
                        </Button> 
                        : null
                    }
                </Container>
                <SurveyWalkGrid user={user} />
                </div>
            </main>
        </>
    );
}