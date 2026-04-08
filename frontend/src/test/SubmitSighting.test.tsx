import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import SubmitSightingPage from '../pages/SubmitSighting';
import { SightingsService, RafflesGoService} from '../api';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { saveDraft, getDraft } from '../services/SightingDraftsService';
import type { SightingDraft } from '../types/sightingDrafts';
import { ThemeProvider } from '../contexts/ThemeContext';

// Mock the openapi client to prevent actual network calls
vi.mock('../api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../api')>();
    return {
        ...actual,
        SightingsService: {
            postApiSightings: vi.fn(),
        },
        RafflesGoService: {
            ...actual.RafflesGoService,
            getCurrentUser: vi.fn(),
            listSurveyWalksForCurrentUser: vi.fn(),
        },
        OpenAPI: {
            HEADERS: {},
        },
    };
});

// Mock leaflet since it uses window objects and doesn't work well in JSDOM out of the box

vi.mock('react-leaflet', () => ({
    MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
    TileLayer: () => <div data-testid="tile-layer" />,
    Marker: () => <div data-testid="marker" />,
    useMapEvents: () => ({ flyTo: vi.fn(), getZoom: () => 10 }),
}));

// Mock exifr
vi.mock('exifr', () => ({
    default: {
        gps: vi.fn().mockResolvedValue({ latitude: 1.35, longitude: 103.8 }),
    },
}));

// Mock firebase
vi.mock('firebase/storage', () => ({
    ref: vi.fn(),
    uploadBytes: vi.fn().mockResolvedValue({}),
    getDownloadURL: vi.fn().mockResolvedValue('https://example.com/image.jpg'),
}));

vi.mock('../lib/firebase', () => ({
    storage: {},
}));

// Mock the draft service
vi.mock('../services/SightingDraftsService', () => ({
    saveDraft: vi.fn().mockResolvedValue(undefined),
    getDraft: vi.fn(),
    deleteDraft: vi.fn().mockResolvedValue(undefined),
}));

const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    getIdToken: vi.fn().mockResolvedValue('fake-token'),
} as unknown as import('firebase/auth').User;

describe('SubmitSightingPage', () => {
    const mockLeaderWalk = {
        uid: 'walk-1',
        surveyPeriodUid: 'period-1',
        surveyPeriodName: 'Period One',
        name: 'Thomson Nature Park Route A',
        date: '2026-03-27T00:00:00.000Z',
        startTime: '09:00',
        endTime: '11:00',
        capacity: 10,
        isFinished: false,
        volunteers: [{ uid: 'test-user-123', name: 'Test User' }],
        leader: { uid: 'test-user-123', name: 'Test User' },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset the URL to clear any residual draftId from previous tests
        window.history.pushState({}, '', '/');

        vi.mocked(RafflesGoService.getCurrentUser).mockResolvedValue({
            uid: 'test-user-123',
            email: 'test@example.com',
            role: 'user',
        });
        vi.mocked(RafflesGoService.listSurveyWalksForCurrentUser).mockResolvedValue({
            surveyWalks: [mockLeaderWalk],
        });
    });

    const renderComponent = () => {
    return render(
        <ChakraProvider value={defaultSystem}>
                    <ThemeProvider>
                        <BrowserRouter>
                            <SubmitSightingPage user={mockUser} />
                        </BrowserRouter>
                    </ThemeProvider>
        </ChakraProvider>
    );
    };

    const waitForLeaderSurveyWalkToLoad = async () => {
        await waitFor(() => {
            expect(screen.getByLabelText(/Survey Walk/i)).toHaveValue('walk-1');
        });
    };

    it('renders correctly and shows additional primate fields when a primate is selected', async () => {
        renderComponent();

        // Check initial render
        expect(screen.getByRole('heading', { name: 'Log an Observation' })).toBeInTheDocument();

        const speciesDropdown = screen.getByLabelText(/Species/i);
        expect(speciesDropdown).toBeInTheDocument();

        // Default species is "Raffles' Banded Langur" which is a primate
        expect(screen.getByLabelText(/^Adults/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Juveniles/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Behaviour/i)).toBeInTheDocument();

        // Change to Wild Boar
        fireEvent.change(speciesDropdown, { target: { value: 'Wild Boar' } });
        expect(screen.queryByLabelText(/^Adults/i)).not.toBeInTheDocument();

        // Change to Other
        fireEvent.change(speciesDropdown, { target: { value: 'Other' } });
        expect(screen.getByLabelText(/Specify Other Species/i)).toBeInTheDocument();
    });

    it('extracts GPS coordinates when a photo is uploaded', async () => {
        const { container } = renderComponent();

        await waitForLeaderSurveyWalkToLoad();

        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByText(/Pinned: 1.35000, 103.80000/i)).toBeInTheDocument();
        });
    });

    it('submits a "sighted" report successfully with correct payload', async () => {
        renderComponent();

        await waitForLeaderSurveyWalkToLoad();

        vi.mocked(SightingsService.postApiSightings).mockResolvedValueOnce({
            message: 'Success',
            sighting: {id: 'mock-sighting-1',
                        surveyWalkUid: 'walk-1',
                        result: 'sighted',
                        date: '2023-10-10',
                        time: '14:00',
                        location: 'Thomson Nature Park Route A',
                        notes: '',
                        submittedBy: 'test-user-123',
                        species: "Raffles' Banded Langur",
                        adults: 2,
                        juveniles: 1,
                        behaviour: 'Feeding',
                        latitude: undefined,
                        longitude: undefined,
                        mediaUrl: undefined,
                    },
        });

        fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2023-10-10' } });
        fireEvent.change(screen.getByLabelText(/Time/i), { target: { value: '14:00' } });
    fireEvent.change(screen.getByLabelText(/Survey Walk/i), { target: { value: 'walk-1' } });

        fireEvent.change(screen.getByLabelText(/Species/i), { target: { value: "Raffles' Banded Langur" } });
        fireEvent.change(screen.getByLabelText(/^Adults/i), { target: { value: '2' } });
        fireEvent.change(screen.getByLabelText(/^Juveniles/i), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/Behaviour/i), { target: { value: 'Feeding' } });

        fireEvent.click(screen.getByRole('button', { name: /Submit Report/i }));

        await waitFor(() => {
            expect(SightingsService.postApiSightings).toHaveBeenCalledWith(expect.objectContaining({
                surveyWalkUid: 'walk-1',
                result: 'sighted',
                location: 'Thomson Nature Park Route A',
                date: '2023-10-10',
                time: '14:00',
                species: "Raffles' Banded Langur",
                adults: 2,
                juveniles: 1,
                behaviour: 'Feeding',
            }));
        });
    });

    it('submits a "not_sighted" report successfully with correct minimum payload', async () => {
        const { container } = renderComponent();

        await waitForLeaderSurveyWalkToLoad();

        vi.mocked(SightingsService.postApiSightings).mockResolvedValueOnce({
            message: 'Success',
            sighting: {
                id: 'mock-sighting-2',
                surveyWalkUid: 'walk-1',
                result: 'not_sighted',
                date: '2023-10-11',
                time: '09:00',
                location: 'Springleaf Route C',
                notes: 'Raining',
                submittedBy: 'test-user-123',
                species: undefined,
                adults: undefined,
                juveniles: undefined,
                behaviour: undefined,
                latitude: undefined,
                longitude: undefined,
                mediaUrl: undefined,
            },
        });

        fireEvent.click(screen.getByRole('button', { name: /Zero Sightings/i }));

        fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2023-10-11' } });
        fireEvent.change(screen.getByLabelText(/Time/i), { target: { value: '09:00' } });
        fireEvent.change(screen.getByLabelText(/Survey Walk/i), { target: { value: 'walk-1' } });

        const notesTextArea = container.querySelector('#notes') as HTMLTextAreaElement;
        fireEvent.change(notesTextArea, { target: { value: 'Raining' } });

        fireEvent.click(screen.getByRole('button', { name: /Submit Report/i }));

        await waitFor(() => {
            expect(SightingsService.postApiSightings).toHaveBeenCalledWith(expect.objectContaining({
                surveyWalkUid: 'walk-1',
                result: 'not_sighted',
                location: 'Thomson Nature Park Route A',
                date: '2023-10-11',
                time: '09:00',
                notes: 'Raining',
            }));
        });
    });

    it('should call saveDraft and show success message when "Save Draft" is clicked', async () => {
        // Arrange
        renderComponent();
        await waitForLeaderSurveyWalkToLoad();
        const dateInput = screen.getByLabelText(/Date/i);
        fireEvent.change(dateInput, { target: { value: '2026-03-27' } });

        // Act
        const saveButton = screen.getByRole('button', { name: /Save Draft/i });
        fireEvent.click(saveButton);

        // Assert
        await waitFor(() => {
            // Verify the service was called
            expect(saveDraft).toHaveBeenCalled();
            // Verify the UI feedback
            expect(screen.getByText(/Draft saved locally/i)).toBeInTheDocument();
        });
    });

    it('should not submit the form when Enter is pressed in the time picker', async () => {
        renderComponent();

        fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2026-03-27' } });

        const timeInput = screen.getByLabelText(/Time/i);
        fireEvent.focus(timeInput);
        fireEvent.change(timeInput, { target: { value: '14:00' } });
        fireEvent.keyDown(timeInput, { key: 'Enter', code: 'Enter', charCode: 13 });

        await waitFor(() => {
            expect(screen.getByLabelText(/Time/i)).toHaveValue('14:00');
        });

        expect(SightingsService.postApiSightings).not.toHaveBeenCalled();
        expect(screen.queryByText(/Failed to submit report/i)).not.toBeInTheDocument();
    });

    it('should show error message when saving a draft fails', async () => {
        // Arrange
        renderComponent();
        await waitForLeaderSurveyWalkToLoad();
        // Force the saveDraft service to throw an error
        vi.mocked(saveDraft).mockRejectedValueOnce(new Error('Save failed'));

        // Act
        const saveButton = screen.getByRole('button', { name: /Save Draft/i });
        fireEvent.click(saveButton);

        // Assert
        await waitFor(() => {
            // Verify that the error message from the catch block is displayed
            expect(screen.getByText(/Failed to save draft/i)).toBeInTheDocument();
        });
    });

    it('should automatically load draft data when draftId is present in the URL', async () => {
    // Arrange
    const mockId = 'test-draft-123';

    const mockDraftData: SightingDraft = {
        id: mockId,
        userId: 'test-user-123',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
        status: 'draft',
        formData: {
        result: 'sighted',
        surveyWalkUid: 'walk-1',
        date: '2026-12-25',
        time: '14:00',
        location: 'Springleaf Route C',
        species: 'Macaque',
        latitude: 1.3521,
        longitude: 103.8198,
        adults: 3,
        juveniles: 2,
        behaviour: 'Eating',
        notes: 'Found near the tree',
        mediaUrl: ''
        },
        media: [],
        lastError: null 
    };

    vi.mocked(getDraft).mockResolvedValue(mockDraftData);
    window.history.pushState({}, 'Test Page', `/submit-sighting?draftId=${mockId}`);

    // Act
    renderComponent();

    // Assert
    await waitFor(() => {
        expect(screen.getByLabelText(/Survey Walk/i)).toHaveValue('walk-1');
        expect(getDraft).toHaveBeenCalledWith(mockId);
        expect(screen.getByLabelText(/Date/i)).toHaveValue('2026-12-25');
        expect(screen.getByLabelText(/Time/i)).toHaveValue('14:00');
        expect(screen.getByLabelText(/Species/i)).toHaveValue('Macaque');
        expect(screen.getByText(/Draft loaded/i)).toBeInTheDocument();
    });
    });

    it('should remove a specific file from the list when the "X" button is clicked', async () => {
        // Arrange
        const { container } = renderComponent();
        await waitForLeaderSurveyWalkToLoad();
        const file1 = new File(['file1'], 'photo1.jpg', { type: 'image/jpeg' });
        const file2 = new File(['file2'], 'photo2.jpg', { type: 'image/jpeg' });
        
        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

        // Act
        fireEvent.change(fileInput, { target: { files: [file1, file2] } });

        // CRITICAL: We must wait for the async handleFileChange to finish and render the list
        await waitFor(() => {
            expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
            expect(screen.getByText('photo2.jpg')).toBeInTheDocument();
        });

        // Now that the files are rendered, the buttons will exist
        // Using getAllByText('X') to target the specific labels
        const removeButtons = screen.getAllByText('X'); 
        fireEvent.click(removeButtons[1]);

        // Assert
        await waitFor(() => {
            // Verify photo2 is gone and photo1 remains
            expect(screen.queryByText('photo2.jpg')).not.toBeInTheDocument();
            expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
        });
    });

    it('should show error message and re-enable the button when API submission fails', async () => {
        // Arrange
        renderComponent();
        await waitForLeaderSurveyWalkToLoad();
        
        // Fill in REQUIRED fields so the form can actually be submitted
        fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2026-03-27' } });
        fireEvent.change(screen.getByLabelText(/Time/i), { target: { value: '14:00' } });
        
        // Mock the API to reject so we hit the catch block
        vi.mocked(SightingsService.postApiSightings).mockRejectedValueOnce(new Error('Internal Server Error'));

        // Act
        const submitButton = screen.getByRole('button', { name: /Submit Report/i });
        fireEvent.click(submitButton);

        // Assert
        await waitFor(() => {
            // Now it should hit the catch block and show the message
            expect(screen.getByText(/Failed to submit report/i)).toBeInTheDocument();
            // And check if the button is re-enabled in the 'finally' block
            expect(submitButton).not.toBeDisabled();
        });
    });

    it('should show "Draft not found" message when the draft ID does not exist in storage', async () => {
        // Arrange
        // Mock getDraft to return null, simulating a missing record
        vi.mocked(getDraft).mockResolvedValue(undefined);
        window.history.pushState({}, 'Test Page', '/submit-sighting?draftId=non-existent-id');

        // Act
        renderComponent();

        await waitForLeaderSurveyWalkToLoad();

        // Assert
        await waitFor(() => {
            // Verify the specific error message for missing drafts
            expect(screen.getByText(/Draft not found/i)).toBeInTheDocument();
        });
    });

    it('should update the position when "Use Device GPS" button is clicked', async () => {
        // Arrange
        const mockCoords = { latitude: 1.35208, longitude: 103.81984 };
        const getCurrentPositionMock = vi.fn().mockImplementationOnce((success) =>
            success({ coords: mockCoords })
        );
        vi.stubGlobal('navigator', {
            ...global.navigator,
            geolocation: { getCurrentPosition: getCurrentPositionMock }
        });
        renderComponent();
        await waitForLeaderSurveyWalkToLoad();

        // Act
        const gpsButton = screen.getByRole('button', { name: /Use Device GPS/i });
        fireEvent.click(gpsButton);

        // Assert
        await waitFor(() => {
            // Verify coordinates appear on screen formatted to 5 decimal places
            expect(screen.getByText(/Pinned: 1.35208, 103.81984/i)).toBeInTheDocument();
        });
    });

    
});
