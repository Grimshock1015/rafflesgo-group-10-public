import { RafflesGoService } from "@/api";
import { useTheme } from "@/contexts/ThemeContext";
import { Box, ButtonGroup, Grid, IconButton, Pagination, Select, Text, createListCollection } from "@chakra-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";

import { SurveyWalkCard } from "./SurveyWalkGridCard";
import type { SurveyWalk } from "./SurveyWalkGrid.types";
import { useNavigate } from "react-router-dom";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi";

const SURVEY_WALK_PAGE_SIZE = 6;

export default function SurveyWalkGrid({ user }: { user: User }) {
    const [surveyWalks, setSurveyWalks] = useState<SurveyWalk[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [onlyActive, setOnlyActive] = useState(true);
    const [role, setRole] = useState<'user' | 'admin'>('user');
    const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
    const [adminWalkScope, setAdminWalkScope] = useState<string[]>(["joined"]);
    const [currentPage, setCurrentPage] = useState(1);
    const [cardsVisible, setCardsVisible] = useState(true);
    const cardsTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { effectiveTheme } = useTheme();
    const selectBg = effectiveTheme === "dark" ? "gray.800" : "white";
    const selectBorder = effectiveTheme === "dark" ? "gray.600" : "gray.200";
    const selectItemHoverBg = effectiveTheme === "dark" ? "gray.700" : "gray.50";
    const paginationButtonBg = effectiveTheme === 'dark' ? 'whiteAlpha.100' : 'white';
    const paginationButtonBorder = effectiveTheme === 'dark' ? 'whiteAlpha.300' : 'gray.300';
    const paginationButtonText = effectiveTheme === 'dark' ? 'whiteAlpha.900' : 'gray.700';
    const paginationButtonHoverBg = effectiveTheme === 'dark' ? 'whiteAlpha.200' : 'gray.100';
    const navigate = useNavigate();

    const volunteerWalkScopeCollection = useMemo(() => createListCollection({
        items: [
            { value: "all", label: "All available walks" },
            { value: "mine", label: "My joined walks" },
        ],
    }), []);

    const adminWalkScopeCollection = useMemo(() => createListCollection({
        items: [
            { value: "joined", label: "Only active survey walks" },
            { value: "all", label: "All survey walks" },
        ],
    }), []);

    useEffect(() => {
        let isMounted = true;

        const fetchRole = async () => {
            try {
                const response = await RafflesGoService.getCurrentUser();
                if (isMounted) {
                    setRole(response.role);
                }
            } catch {
                if (isMounted) {
                    setRole('user');
                }
            }
        };

        fetchRole();

        return () => {
            isMounted = false;
        };
    }, [user.uid]);

    const fetchSurveyWalks = async (options?: { initial?: boolean; onlyActive?: boolean }) => {
        const isInitial = options?.initial === true;
        if (isInitial) {
            setIsInitialLoading(true);
        } else {
            setIsRefreshing(true);
        }

        try {
            const useOnlyActive = options?.onlyActive ?? true;
            if (role === "admin" && !useOnlyActive) {
                const response = await RafflesGoService.listSurveyWalks();
                response.surveyWalks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                setSurveyWalks(response.surveyWalks);
                setOnlyActive(false);
            } else {
                const response = await RafflesGoService.listSurveyWalksForCurrentUser();
                response.surveyWalks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                setSurveyWalks(response.surveyWalks);
                setOnlyActive(true);
            }
            setCurrentPage(1);
        } catch (error) {
            console.error("Failed to fetch survey walks:", error);
        } finally {
            if (isInitial) {
                setIsInitialLoading(false);
            } else {
                setIsRefreshing(false);
            }
        }
    };

    useEffect(() => {
        fetchSurveyWalks({ initial: true, onlyActive: true });
    }, [role]);

    const refreshSurveyWalks = () => {
        void fetchSurveyWalks({ onlyActive });
    };

    const displayedWalks = useMemo(() => {
        if (role === 'admin') return surveyWalks;

        if (activeTab === 'all') {
            return surveyWalks
                .filter((sw) => !sw.isFinished)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }

        const myWalks = surveyWalks.filter((sw) => sw.volunteers.some((v) => v.uid === user.uid));
        const upcoming = myWalks
            .filter((sw) => !sw.isFinished)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const finished = myWalks
            .filter((sw) => sw.isFinished)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return [...upcoming, ...finished];
    }, [surveyWalks, activeTab, role, user.uid]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, role, onlyActive]);

    useEffect(() => {
        return () => {
            if (cardsTransitionTimerRef.current) {
                clearTimeout(cardsTransitionTimerRef.current);
            }
        };
    }, []);

    const totalPages = Math.max(1, Math.ceil(displayedWalks.length / SURVEY_WALK_PAGE_SIZE));
    const currentPageSafe = Math.min(currentPage, totalPages);
    const pageStart = (currentPageSafe - 1) * SURVEY_WALK_PAGE_SIZE;
    const pagedWalks = displayedWalks.slice(pageStart, pageStart + SURVEY_WALK_PAGE_SIZE);

    return isInitialLoading ? <Text>Loading survey walks...</Text> : surveyWalks.length === 0 ? <Text>No survey walks found.</Text> : (
        <>
            {role !== 'admin' && (
                <Select.Root
                    collection={volunteerWalkScopeCollection}
                    value={[activeTab]}
                    onValueChange={(event) => {
                        const selected = event.value[0] as 'all' | 'mine' | undefined;
                        setActiveTab(selected ?? 'all');
                    }}
                    size="sm"
                    width="320px"
                    mb={4}
                >
                    <Select.HiddenSelect />
                    <Select.Label />

                    <Select.Control>
                        <Select.Trigger px={3} py={2} bg={"transparent"} borderColor={selectBorder} borderRadius="var(--radius-md)">
                            <Select.ValueText px={1} />
                        </Select.Trigger>
                        <Select.IndicatorGroup pr={2}>
                            <Select.Indicator />
                        </Select.IndicatorGroup>
                    </Select.Control>

                    <Select.Positioner>
                        <Select.Content bg={selectBg} borderColor={selectBorder} borderRadius="var(--radius-md)">
                            {volunteerWalkScopeCollection.items.map((item) => (
                                <Select.Item item={item} key={item.value} py={2.5} px={3} bg={selectBg} _highlighted={{ bg: selectItemHoverBg }}>
                                    {item.label}
                                    <Select.ItemIndicator />
                                </Select.Item>
                            ))}
                        </Select.Content>
                    </Select.Positioner>
                </Select.Root>
            )}

            <Box display="flex" alignItems="center" justifyContent="space-between" mb={0}>
                <Text mb={0}>{role === "admin" && "You can bulk create walks by editing a survey period!"}</Text>
            </Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={0}>
                {/* <Text mb={0}>{role === "admin" && !onlyActive ? "Displaying all survey walks:" : "Displaying survey walks for active survey period:"}</Text> */}
                {isRefreshing && <Text fontSize="sm" color="gray.500">Refreshing...</Text>}
            </Box>

            <Box mt={2} mb={role === "admin" ? 0 : 4}>
                <Text fontSize="sm" color="gray.500" mb={0}>
                    Showing {pagedWalks.length} of {displayedWalks.length} walks.
                </Text>
            </Box>

            {role === "admin" && (
                <Select.Root
                    collection={adminWalkScopeCollection}
                    value={adminWalkScope}
                    onValueChange={(event) => {
                        setAdminWalkScope(event.value);
                        const selected = event.value[0] ?? "joined";
                        void fetchSurveyWalks({ initial: true, onlyActive: selected === "joined" });
                    }}
                    size="sm"
                    width="320px"
                    mb={5}
                >
                    <Select.HiddenSelect />
                    <Select.Label />

                    <Select.Control>
                        <Select.Trigger px={3} py={2} bg={"transparent"} borderColor={selectBorder} borderRadius="var(--radius-md)">
                            <Select.ValueText px={1} />
                        </Select.Trigger>
                        <Select.IndicatorGroup pr={2}>
                            <Select.Indicator />
                        </Select.IndicatorGroup>
                    </Select.Control>

                    <Select.Positioner>
                        <Select.Content bg={selectBg} borderColor={selectBorder} borderRadius="var(--radius-md)">
                            {adminWalkScopeCollection.items.map((item) => (
                                <Select.Item item={item} key={item.value} py={2.5} px={3} bg={selectBg} _highlighted={{ bg: selectItemHoverBg }}>
                                    {item.label}
                                    <Select.ItemIndicator />
                                </Select.Item>
                            ))}
                        </Select.Content>
                    </Select.Positioner>
                </Select.Root>
            )}

            <Box
                opacity={cardsVisible ? 1 : 0}
                transform={cardsVisible ? 'translateY(0)' : 'translateY(8px)'}
                transition="opacity 180ms ease, transform 180ms ease"
            >
                <Grid templateColumns="repeat(auto-fill, minmax(320px, 1fr))" gridAutoRows="1fr" gapX={5} gapY={7} mt={3}>
                    {pagedWalks.map((sw) => (
                        <SurveyWalkCard
                            key={sw.uid}
                            sw={sw}
                            onJoin={refreshSurveyWalks}
                            user={user}
                            role={role}
                            onEdit={(uid) => {
                                navigate('/edit-survey-walk/' + uid);
                            }}
                        />
                    ))}
                </Grid>
            </Box>

            <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                mt={6}
                mb={2}
            >
                <Pagination.Root
                    count={displayedWalks.length}
                    pageSize={SURVEY_WALK_PAGE_SIZE}
                    page={currentPageSafe}
                    onPageChange={(event) => {
                        if (event.page === currentPageSafe) return;

                        if (cardsTransitionTimerRef.current) {
                            clearTimeout(cardsTransitionTimerRef.current);
                        }

                        setCardsVisible(false);
                        cardsTransitionTimerRef.current = setTimeout(() => {
                            setCurrentPage(event.page);
                            setCardsVisible(true);
                            cardsTransitionTimerRef.current = null;
                        }, 140);
                    }}
                >
                    <ButtonGroup gap="2" size="sm" variant="outline">
                        <Pagination.PrevTrigger asChild>
                            <IconButton
                                aria-label="Previous page"
                                bg={paginationButtonBg}
                                borderWidth="1px"
                                borderColor={paginationButtonBorder}
                                color={paginationButtonText}
                                _hover={{ bg: paginationButtonHoverBg }}
                                _disabled={{ opacity: 0.35, cursor: 'not-allowed' }}
                            >
                                <HiChevronLeft />
                            </IconButton>
                        </Pagination.PrevTrigger>
                        <Pagination.PageText style={{ color: effectiveTheme === 'dark' ? 'var(--text-primary)' : 'var(--text-secondary)' }} />
                        <Pagination.NextTrigger asChild>
                            <IconButton
                                aria-label="Next page"
                                bg={paginationButtonBg}
                                borderWidth="1px"
                                borderColor={paginationButtonBorder}
                                color={paginationButtonText}
                                _hover={{ bg: paginationButtonHoverBg }}
                                _disabled={{ opacity: 0.35, cursor: 'not-allowed' }}
                            >
                                <HiChevronRight />
                            </IconButton>
                        </Pagination.NextTrigger>
                    </ButtonGroup>
                </Pagination.Root>
            </Box>
        </>
    );
}
