/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,svelte,js,ts}'],
	theme: {
		extend: {}
	},
	plugins: [require('daisyui')],
	daisyui: {
		themes: ['light', 'dark'],
		// You can try adding these lines to reduce logging (though not officially documented, some users suggest these)
		logs: false, // Disable the plugin's log output
		rtl: false // Disable right-to-left support if not needed
	}
};
