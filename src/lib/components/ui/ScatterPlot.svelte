<script>
  import * as d3 from 'd3';
  
  // Make default size larger and responsive
  let containerWidth = $state();
  let containerHeight = $state();
  
  let width = $derived(containerWidth || 600);
  let height = $derived(containerHeight || 500);
  
  let margin = {top: 20, right: 30, bottom: 50, left: 60};
  
  let { data } = $props();
  
  // Handle empty data case
  $effect(() => {
    if (!data || data.length === 0) {
      data = [];
    }
  });
  
  // Calculate font size based on container width
  const fontSize = $derived(
    Math.max(12, Math.min(16, width / 40))
  );
  
  // Calculate point radius based on container size
  const pointRadius = $derived(
    Math.max(4, Math.min(8, width / 100))
  );
  
  // Calculate domains with safety checks for empty data
  const xDomain = $derived(
    data.length > 0 
      ? [d3.min(data, d => d[0]), d3.max(data, d => d[0])]
      : [-1, 1]
  );
  
  const yDomain = $derived(
    data.length > 0 
      ? [d3.min(data, d => d[1]), d3.max(data, d => d[1])]
      : [-1, 1]
  );
  
  // Make sure domains include zero for proper axis crossing
  const xDomainWithZero = $derived([
    Math.min(0, xDomain[0] - Math.abs(xDomain[0] * 0.05)),
    Math.max(0, xDomain[1] + Math.abs(xDomain[1] * 0.05))
  ]);
  
  const yDomainWithZero = $derived([
    Math.min(0, yDomain[0] - Math.abs(yDomain[0] * 0.05)),
    Math.max(0, yDomain[1] + Math.abs(yDomain[1] * 0.05))
  ]);
  
  // Create scales that ensure zero is included
  const xScale = $derived(
    d3.scaleLinear()
      .domain(xDomainWithZero)
      .range([margin.left, width - margin.right])
      .nice()
  );
  
  const yScale = $derived(
    d3.scaleLinear()
      .domain(yDomainWithZero)
      .range([height - margin.bottom, margin.top])
      .nice()
  );
  
  // Calculate the pixel position of zero for both axes
  const xZeroPixel = $derived(xScale(0));
  const yZeroPixel = $derived(yScale(0));
  
  let xAxisPos, xAxisNeg;
  let yAxisPos, yAxisNeg;
  
  // Calculate the number of ticks based on available space
  const xTicks = $derived(Math.max(4, Math.floor(width / 100)));
  const yTicks = $derived(Math.max(4, Math.floor(height / 80)));
  
  // Update axes when scales or dimensions change
  $effect(() => {
    if (xAxisPos && xAxisNeg && yAxisPos && yAxisNeg && data.length > 0) {
      // X-axis positive side
      d3.select(xAxisPos)
        .call(d3.axisBottom(xScale).ticks(xTicks)
          .tickFormat(d => d <= 0 ? "" : d)) // Only show positive labels
        .call(g => g.select(".domain").attr("stroke", "#888"))
        .call(g => g.selectAll(".tick line").attr("stroke", "#888"))
        .call(g => g.selectAll(".tick text")
          .attr("fill", "#333")
          .attr("font-size", `${fontSize}px`)
          .attr("font-weight", "bold"));
          
      // X-axis negative side (with reversed ticks)
      d3.select(xAxisNeg)
        .call(d3.axisTop(xScale).ticks(xTicks)
          .tickFormat(d => d >= 0 ? "" : Math.abs(d))) // Only show negative labels as positives
        .call(g => g.select(".domain").attr("stroke", "#888"))
        .call(g => g.selectAll(".tick line").attr("stroke", "#888"))
        .call(g => g.select(".domain").remove()) // Remove duplicate axis line
        .call(g => g.selectAll(".tick text")
          .attr("fill", "#333")
          .attr("font-size", `${fontSize}px`)
          .attr("font-weight", "bold")
          .attr("dy", "-0.5em")); // Adjust text position
          
      // Y-axis positive side
      d3.select(yAxisPos)
        .call(d3.axisLeft(yScale).ticks(yTicks)
          .tickFormat(d => d <= 0 ? "" : d)) // Only show positive labels
        .call(g => g.select(".domain").attr("stroke", "#888"))
        .call(g => g.selectAll(".tick line").attr("stroke", "#888"))
        .call(g => g.selectAll(".tick text")
          .attr("fill", "#333")
          .attr("font-size", `${fontSize}px`)
          .attr("font-weight", "bold"));
          
      // Y-axis negative side
      d3.select(yAxisNeg)
        .call(d3.axisRight(yScale).ticks(yTicks)
          .tickFormat(d => d >= 0 ? "" : Math.abs(d))) // Only show negative labels as positives
        .call(g => g.select(".domain").attr("stroke", "#888"))
        .call(g => g.selectAll(".tick line").attr("stroke", "#888"))
        .call(g => g.select(".domain").remove()) // Remove duplicate axis line
        .call(g => g.selectAll(".tick text")
          .attr("fill", "#333")
          .attr("font-size", `${fontSize}px`)
          .attr("font-weight", "bold")
          .attr("dx", "0.5em")); // Adjust text position
    }
  });
</script>

<div class="scatter-container" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
  <svg {width} {height} viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet">
    <!-- Draw axis lines passing through origin -->
    <line 
      x1={margin.left} 
      y1={yZeroPixel} 
      x2={width - margin.right} 
      y2={yZeroPixel} 
      stroke="#555" 
      stroke-width="1.5" 
    />
    <line 
      x1={xZeroPixel} 
      y1={margin.top} 
      x2={xZeroPixel} 
      y2={height - margin.bottom} 
      stroke="#555" 
      stroke-width="1.5" 
    />
    
    <!-- Data points -->
    {#each data as d, i}
      <circle
        cx={xScale(d[0])}
        cy={yScale(d[1])}
        r={pointRadius}
        fill="steelblue"
        stroke="white"
        stroke-width="1"
        opacity="0.8"
      />
    {/each}
    
    <!-- Axes with ticks (split into positive and negative sides) -->
    <g class="x-axis-pos" transform="translate(0, {yZeroPixel})"
       bind:this={xAxisPos} />
       
    <g class="x-axis-neg" transform="translate(0, {yZeroPixel})"
       bind:this={xAxisNeg} />
    
    <g class="y-axis-pos" transform="translate({xZeroPixel}, 0)"
       bind:this={yAxisPos} />
       
    <g class="y-axis-neg" transform="translate({xZeroPixel}, 0)"
       bind:this={yAxisNeg} />
       
    <!-- Add small origin label -->
    <text
      x={xZeroPixel + 5}
      y={yZeroPixel - 5}
      font-size={fontSize}
      font-weight="bold"
      fill="#333"
    >0</text>
  </svg>
</div>

<style>
  .scatter-container {
    width: 100%;
    height: 100%;
    min-height: 300px;
    box-sizing: border-box;
  }
  
  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  
  :global(.tick text) {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
  }
  
  :global(.domain) {
    stroke-width: 1.5;
  }
</style>
