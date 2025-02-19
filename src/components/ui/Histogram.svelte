<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as d3 from 'd3';
    
    let prop = $props();
	let data = prop.data.map(datum => (Math.log10(datum.standard_value)));

	const binNumber = 100;
	let width: number, height: number;

    let xLabel = prop.xLabel || 'X Axis Label';
	let yLabel = prop.yLabel || 'Y Axis Label';
	
    const updateSize = () => {
		const container = document.getElementById('histogram-container');
		width = container.offsetWidth;
		height = container.offsetHeight;
		renderChart();
	};
	let svg;
	const renderChart = () => {
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
			.domain([0, d3.max(data)])
			.range([0, width - margin.left - margin.right]);
		const bins = d3.bin().domain(x.domain()).thresholds(binNumber)(data);
		const y = d3
			.scaleLinear()
			.domain([0, d3.max(bins, (d) => d.length)])
			.range([height - margin.top - margin.bottom, 0]);

		svgElement
			.selectAll('.bar')
			.data(bins)
			.enter()
			.append('rect')
			.attr('class', 'bar')
			.attr('x', (d) => x(d.x0))
			.attr('y', (d) => y(d.length))
			.attr('width', (d) => x(d.x1) - x(d.x0) - 1)
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

	onMount(() => {
		window.addEventListener('resize', updateSize);
		updateSize();
		onDestroy(() => {
			window.removeEventListener('resize', updateSize);
		});
	});
</script>

<div id="histogram-container">
	<svg bind:this={svg}></svg>
</div>

<style>
	#histogram-container {
		width: 100%;
		height: 75vh;
	}
</style>
