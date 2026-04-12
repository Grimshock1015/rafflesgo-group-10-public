import type { User } from 'firebase/auth';
import SurveyPeriodGrid from '../components/SurveyPeriodGrid';
import { Button, Container } from '@chakra-ui/react';
import { IoMdAdd } from "react-icons/io";
import { useNavigate } from 'react-router-dom';

export default function SurveyPeriodList({ user }: { user: User }) {
  const navigate = useNavigate();
  return (
    <>
      <main className="main-content">
        <div className="container">
          <Container justifyContent={"space-between"} display={"flex"} alignItems={"center"} mt={5}>
            <h1>
              List of Survey Periods
            </h1>
            <Button
              variant="plain"
              className="btn btn-primary"
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
