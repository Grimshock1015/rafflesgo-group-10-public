import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import SubmitSightingPage from '../pages/SubmitSighting';
import { SightingsService } from '../api';

// Mock the openapi client to prevent actual network calls
vi.mock('../api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../api')>();
    return {
        ...actual,
        SightingsService: {
            postApiSightings: vi.fn(),
        },
        OpenAPI: {
            HEADERS: {},
        },
    };
});

// Mock leaflet since it uses window objects and doesn't work well in JSDOM out of the box
vi.mock('react-leaflet', () => ({
    MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
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

const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    getIdToken: vi.fn().mockResolvedValue('fake-token'),
} as any;

describe('SubmitSightingPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderComponent = () => {
        return render(
            <BrowserRouter>
                <SubmitSightingPage user={mockUser} />
            </BrowserRouter>
        );
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

        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByText(/Pinned: 1.35000, 103.80000/i)).toBeInTheDocument();
        });
    });

    it('submits a "sighted" report successfully with correct payload', async () => {
        renderComponent();

        vi.mocked(SightingsService.postApiSightings).mockResolvedValueOnce({
            message: 'Success',
            sighting: {} as any
        });

        fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2023-10-10' } });
        fireEvent.change(screen.getByLabelText(/Time/i), { target: { value: '14:00' } });
        fireEvent.change(screen.getByLabelText(/Survey Route/i), { target: { value: 'Thomson Nature Park Route A' } });

        fireEvent.change(screen.getByLabelText(/Species/i), { target: { value: "Raffles' Banded Langur" } });
        fireEvent.change(screen.getByLabelText(/^Adults/i), { target: { value: '2' } });
        fireEvent.change(screen.getByLabelText(/^Juveniles/i), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/Behaviour/i), { target: { value: 'Feeding' } });

        fireEvent.click(screen.getByRole('button', { name: /Submit Report/i }));

        await waitFor(() => {
            expect(SightingsService.postApiSightings).toHaveBeenCalledWith(expect.objectContaining({
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

        vi.mocked(SightingsService.postApiSightings).mockResolvedValueOnce({
            message: 'Success',
            sighting: {} as any
        });

        fireEvent.click(screen.getByRole('button', { name: /Zero Sightings/i }));

        fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2023-10-11' } });
        fireEvent.change(screen.getByLabelText(/Time/i), { target: { value: '09:00' } });
        fireEvent.change(screen.getByLabelText(/Survey Route/i), { target: { value: 'Springleaf Route C' } });

        const notesTextArea = container.querySelector('#notes') as HTMLTextAreaElement;
        fireEvent.change(notesTextArea, { target: { value: 'Raining' } });

        fireEvent.click(screen.getByRole('button', { name: /Submit Report/i }));

        await waitFor(() => {
            expect(SightingsService.postApiSightings).toHaveBeenCalledWith(expect.objectContaining({
                result: 'not_sighted',
                location: 'Springleaf Route C',
                date: '2023-10-11',
                time: '09:00',
                notes: 'Raining',
            }));
        });
    });
});
