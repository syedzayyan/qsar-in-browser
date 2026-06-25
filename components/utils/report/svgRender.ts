// Builds small, static D3 charts as detached SVG nodes and rasterizes them to
// PNG data URLs for embedding in the PDF report. Kept separate from the
// interactive chart components (Histogram/ScatterPlot/PieChart) since those
// carry tooltips/zoom/modals that don't make sense in a printed report.
import * as d3 from "d3";

const FONT = "11px sans-serif";

function rasterizeSvgString(
  svgString: string,
  width: number,
  height: number,
  scale = 2,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Could not get 2D canvas context"));
      return;
    }
    const img = new Image();
    img.onload = () => {
      ctx.scale(scale, scale);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to rasterize SVG"));
    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgString)));
  });
}

export function svgElementToPngDataUrl(
  svg: SVGSVGElement,
  width: number,
  height: number,
): Promise<string> {
  const svgString = new XMLSerializer().serializeToString(svg);
  return rasterizeSvgString(svgString, width, height);
}

export function svgStringToPngDataUrl(
  svgString: string,
  width: number,
  height: number,
): Promise<string> {
  return rasterizeSvgString(svgString, width, height);
}

const MARGIN = { top: 20, right: 20, bottom: 50, left: 60 };

function chartFrame(width: number, height: number) {
  const svg = d3
    .create("svg")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("background", "#ffffff");
  const boundsWidth = width - MARGIN.left - MARGIN.right;
  const boundsHeight = height - MARGIN.top - MARGIN.bottom;
  const g = svg
    .append("g")
    .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
  return { svg, g, boundsWidth, boundsHeight };
}

function addAxisLabels(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  width: number,
  height: number,
  xLabel: string,
  yLabel: string,
) {
  if (xLabel) {
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height - 8)
      .attr("text-anchor", "middle")
      .style("font", FONT)
      .text(xLabel);
  }
  if (yLabel) {
    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 14)
      .attr("text-anchor", "middle")
      .style("font", FONT)
      .text(yLabel);
  }
}

export function buildHistogramSvg(
  data: number[],
  width: number,
  height: number,
  xLabel = "",
  yLabel = "Count",
): SVGSVGElement {
  const { svg, g, boundsWidth, boundsHeight } = chartFrame(width, height);

  const [min, max] = d3.extent(data) as [number, number];
  const pad =
    Math.abs(max - min) < 1e-9 ? Math.abs(max) * 0.1 + 1 : (max - min) * 0.04;
  const x = d3
    .scaleLinear()
    .domain([min - pad, max + pad])
    .range([0, boundsWidth])
    .nice();
  const bins = d3.bin().domain(x.domain() as [number, number]).thresholds(30)(
    data,
  );
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(bins, (b) => b.length) || 0])
    .range([boundsHeight, 0])
    .nice();

  g.append("g")
    .attr("transform", `translate(0,${boundsHeight})`)
    .call(d3.axisBottom(x).ticks(6))
    .selectAll("text")
    .style("font", FONT);

  g.append("g").call(d3.axisLeft(y).ticks(5)).selectAll("text").style(
    "font",
    FONT,
  );

  g.selectAll("rect")
    .data(bins)
    .join("rect")
    .attr("x", (d) => x(d.x0!) + 1)
    .attr("y", (d) => y(d.length))
    .attr("width", (d) => Math.max(0, x(d.x1!) - x(d.x0!) - 2))
    .attr("height", (d) => boundsHeight - y(d.length))
    .attr("fill", "#2b6cb0");

  addAxisLabels(svg, width, height, xLabel, yLabel);
  return svg.node()!;
}

export function buildScatterSvg(
  points: { x: number; y: number }[],
  colorValues: number[] | undefined,
  width: number,
  height: number,
  xLabel = "",
  yLabel = "",
): SVGSVGElement {
  const { svg, g, boundsWidth, boundsHeight } = chartFrame(width, height);

  const x = d3
    .scaleLinear()
    .domain(d3.extent(points, (d) => d.x) as [number, number])
    .nice()
    .range([0, boundsWidth]);
  const y = d3
    .scaleLinear()
    .domain(d3.extent(points, (d) => d.y) as [number, number])
    .nice()
    .range([boundsHeight, 0]);

  const colorScale =
    colorValues && colorValues.length
      ? d3
          .scaleSequential(d3.interpolateViridis)
          .domain(d3.extent(colorValues) as [number, number])
      : null;

  g.append("g")
    .attr("transform", `translate(0,${boundsHeight})`)
    .call(d3.axisBottom(x).ticks(6))
    .selectAll("text")
    .style("font", FONT);
  g.append("g").call(d3.axisLeft(y).ticks(6)).selectAll("text").style(
    "font",
    FONT,
  );

  g.selectAll("circle")
    .data(points)
    .join("circle")
    .attr("cx", (d) => x(d.x))
    .attr("cy", (d) => y(d.y))
    .attr("r", 2.5)
    .attr("fill", (_d, i) =>
      colorScale ? colorScale(colorValues![i]) : "#2b6cb0",
    )
    .attr("opacity", 0.75);

  addAxisLabels(svg, width, height, xLabel, yLabel);
  return svg.node()!;
}

export function buildLineSvg(
  points: { x: number; y: number }[],
  width: number,
  height: number,
  xLabel = "",
  yLabel = "",
): SVGSVGElement {
  const { svg, g, boundsWidth, boundsHeight } = chartFrame(width, height);

  const x = d3
    .scaleLinear()
    .domain(d3.extent(points, (d) => d.x) as [number, number])
    .nice()
    .range([0, boundsWidth]);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(points, (d) => d.y) || 0])
    .nice()
    .range([boundsHeight, 0]);

  g.append("g")
    .attr("transform", `translate(0,${boundsHeight})`)
    .call(d3.axisBottom(x).ticks(6))
    .selectAll("text")
    .style("font", FONT);
  g.append("g").call(d3.axisLeft(y).ticks(5)).selectAll("text").style(
    "font",
    FONT,
  );

  const line = d3
    .line<{ x: number; y: number }>()
    .x((d) => x(d.x))
    .y((d) => y(d.y));

  g.append("path")
    .datum(points)
    .attr("d", line)
    .attr("fill", "none")
    .attr("stroke", "#2b6cb0")
    .attr("stroke-width", 2);

  addAxisLabels(svg, width, height, xLabel, yLabel);
  return svg.node()!;
}

export function buildPieSvg(
  data: { key: string; value: number }[],
  width: number,
  height: number,
): SVGSVGElement {
  const radius = Math.min(width, height) / 2 - 36;
  const svg = d3
    .create("svg")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("background", "#ffffff");

  const g = svg
    .append("g")
    .attr("transform", `translate(${width / 2},${height / 2 - 14})`);

  const color = d3
    .scaleOrdinal<string>()
    .domain(data.map((d) => d.key))
    .range(d3.schemeTableau10);

  const pie = d3
    .pie<{ key: string; value: number }>()
    .value((d) => d.value)(data);
  const arc = d3
    .arc<d3.PieArcDatum<{ key: string; value: number }>>()
    .innerRadius(0)
    .outerRadius(radius);

  g.selectAll("path")
    .data(pie)
    .join("path")
    .attr("d", arc as any)
    .attr("fill", (d) => color(d.data.key))
    .attr("stroke", "#fff")
    .attr("stroke-width", 1);

  const legend = svg
    .append("g")
    .attr(
      "transform",
      `translate(${width / 2 - (data.length * 100) / 2}, ${height - 22})`,
    );
  data.forEach((d, i) => {
    const item = legend.append("g").attr("transform", `translate(${i * 100},0)`);
    item.append("rect").attr("width", 10).attr("height", 10).attr(
      "fill",
      color(d.key),
    );
    item
      .append("text")
      .attr("x", 14)
      .attr("y", 9)
      .style("font", FONT)
      .text(`${d.key}: ${d.value}`);
  });

  return svg.node()!;
}
