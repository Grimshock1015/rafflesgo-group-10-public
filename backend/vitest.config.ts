import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        coverage: {
            provider: 'v8',
            // Include only specific directories for unit test coverage
            include: [
                'src/services/**',
                'src/handlers/**'
            ],
        },
    },
});