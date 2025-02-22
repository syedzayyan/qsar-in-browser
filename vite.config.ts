import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
    worker : {
        format: 'es',
        plugins: []
    },
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
