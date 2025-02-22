<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as d3 from 'd3';
	import { browser } from '$app/environment';

	export let data: number[] = [];
	export let xLabel: string;
	export let yLabel: string;
	export let act_col: string;

	let processedData: number[] = [];
	let width: number = 0,
		height: number = 0;
	let svg: SVGSVGElement | null = null;
	let binNumber = 100; // Default bin count

	$: processedData = data
		.filter((datum) => datum.hasOwnProperty(act_col)) // Check if act_col exists
		.map((datum) => datum[act_col]);

	const updateSize = () => {
		if (!browser) return;
		const container = document.getElementById('histogram-container');
		if (!container) return;

		width = container.offsetWidth;
		height = container.offsetHeight;

		// Adjust bin number dynamically based on screen size
		binNumber = width < 600 ? 20 : 100; // Reduce bins for small screens

		renderChart();
	};

	const renderChart = () => {
		if (!svg || !browser) return;

		d3.select(svg).selectAll('*').remove();
		const margin = { top: 20, right: 30, bottom: 80, left: 80 };

		const svgElement = d3
			.select(svg)
			.attr('width', width)
			.attr('height', height)
			.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

		const x = d3
			.scaleLinear()
			.domain([0, d3.max(processedData) ?? 0])
			.range([0, width - margin.left - margin.right]);

		const bins = d3.bin().domain(x.domain()).thresholds(binNumber)(processedData);

		const y = d3
			.scaleLinear()
			.domain([0, d3.max(bins, (d) => d.length) ?? 0])
			.range([height - margin.top - margin.bottom, 0]);

		svgElement
			.selectAll('.bar')
			.data(bins)
			.enter()
			.append('rect')
			.attr('class', 'bar')
			.attr('x', (d) => x(d.x0 ?? 0))
			.attr('y', (d) => y(d.length))
			.attr('width', (d) => x(d.x1 ?? 0) - x(d.x0 ?? 0) - 1)
			.attr('height', (d) => height - margin.top - margin.bottom - y(d.length))
			.attr('fill', 'steelblue');

		svgElement
			.append('g')
			.attr('transform', `translate(0,${height - margin.top - margin.bottom})`)
			.call(d3.axisBottom(x).tickSize(10).tickPadding(10))
			.selectAll('text')
			.style('font-size', '18px')
			.style('fill', 'currentColor');

		svgElement
			.append('g')
			.call(d3.axisLeft(y).tickSize(10).tickPadding(10))
			.selectAll('text')
			.style('font-size', '18px')
			.style('fill', 'currentColor');

		svgElement
			.append('text')
			.attr(
				'transform',
				`translate(${(width - margin.left - margin.right) / 2}, ${height - margin.top - margin.bottom + 70})`
			)
			.style('text-anchor', 'middle')
			.style('font-size', '22px')
			.style('fill', 'currentColor')
			.text(xLabel);

		svgElement
			.append('text')
			.attr('transform', 'rotate(-90)')
			.attr('y', -margin.left + 20)
			.attr('x', -(height - margin.top - margin.bottom) / 2)
			.style('text-anchor', 'middle')
			.style('font-size', '22px')
			.style('fill', 'currentColor')
			.text(yLabel);
	};

	$: {
		if (processedData.length > 0 && browser) {
			renderChart();
		}
	}

	onMount(() => {
		if (!browser) return;
		window.addEventListener('resize', updateSize);
		updateSize();
	});

	onDestroy(() => {
		if (!browser) return;
		window.removeEventListener('resize', updateSize);
	});
</script>

<span>Total Number of Molecules Being Shown on The Histogram: {processedData.length}</span>
<div id="histogram-container">
	<svg bind:this={svg}></svg>
</div>

<style>
	#histogram-container {
		width: 100%;
		height: 75vh;
	}
</style>
