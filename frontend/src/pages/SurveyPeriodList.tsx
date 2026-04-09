import type { User } from 'firebase/auth';
import SurveyPeriodGrid from '../components/SurveyPeriodGrid';
import { Button, Container } from '@chakra-ui/react';
import { IoMdAdd } from "react-icons/io";
import { useNavigate } from 'react-router-dom';
import { useTheme } from "@/contexts/ThemeContext";

export default function SurveyPeriodList({ user }: { user: User }) {
  const navigate = useNavigate();
  const { effectiveTheme } = useTheme();
  const outlineButtonColor = effectiveTheme === "dark" ? "gray.200" : "gray.700";
  const outlineButtonBorder = effectiveTheme === "dark" ? "whiteAlpha.300" : "gray.300";
  const outlineButtonHoverBg = effectiveTheme === "dark" ? "whiteAlpha.100" : "gray.100";
  return (
    <>
      <main className="main-content">
        <div className="container">
          <Container justifyContent={"space-between"} display={"flex"} alignItems={"center"} mt={5}>
            <h1>
              List of Survey Periods
            </h1>
            <Button
              px={3}
              variant="outline"
              color={outlineButtonColor}
              borderColor={outlineButtonBorder}
              _hover={{ bg: outlineButtonHoverBg }}
              onClick={() => navigate('/create-survey-period')}
            >
              Create New
              <IoMdAdd/>
            </Button>
          </Container>

          <SurveyPeriodGrid user={user} />
        </div>
      </main>
    </>
  );
}
