import type { User } from 'firebase/auth';
import { Navigation } from '../components/Navigation';
import SurveyPeriodGrid from '../components/SurveyPeriodGrid';
import { Button, Container } from '@chakra-ui/react';
import { IoMdAdd } from "react-icons/io";
import { useNavigate } from 'react-router-dom';

export default function SurveyPeriodList({ user }: { user: User }) {
  const navigate = useNavigate();
  return (
    <>
      <Navigation user={user} />
      <main className="main-content">
        <div className="container">
          <Container justifyContent={"space-between"} display={"flex"} alignItems={"center"} mt={5}>
            <h1>
              List of Survey Periods
            </h1>
            <Button px={3} onClick={() => navigate('/create-survey-period')}>Create New<IoMdAdd/></Button>
          </Container>

          <SurveyPeriodGrid user={user} />
        </div>
      </main>
    </>
  );
}
