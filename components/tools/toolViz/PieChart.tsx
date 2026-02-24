import { useEffect, useRef } from "react";
import * as d3 from "d3";

export default function PieChart({
  data,
  width = 400,
  height = 400,
}: {
  data: { key: string; value: number }[];
  width?: number;
  height?: number;
}) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current || data.length === 0) return;

    const radius = Math.min(width, height) / 2 - 10;

    const svg = d3
      .select(ref.current)
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    svg.selectAll("*").remove();

    const names = data.map((d) => d.key);
    const values = data.map((d) => d.value);

    const color = d3
      .scaleOrdinal<string>()
      .domain(names)
      .range(
        names.length <= 10
          ? d3.schemeTableau10
          : d3.schemeSet3
      );

    const pie = d3
      .pie<number>()
      .sort(null)
      .value((d) => d)(values);

    const arc = d3
      .arc<d3.PieArcDatum<number>>()
      .innerRadius(0)
      .outerRadius(radius);

    const arcLabel = d3
      .arc<d3.PieArcDatum<number>>()
      .innerRadius(radius * 0.6)
      .outerRadius(radius * 0.6);

    const arcs = pie;

    // Draw slices
    svg.append("g")
      .selectAll("path")
      .data(arcs)
      .join("path")
      .attr("fill", (_, i) => color(names[i]))
      .attr("d", arc as any)
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .append("title")
      .text((_, i) => `${names[i]}: ${values[i]}`);

    // Only label sufficiently large slices
    const MIN_ANGLE = 0.3; // radians (~17°) adjust if needed

    svg.append("g")
      .attr("font-family", "sans-serif")
      .attr("font-size", Math.min(12, width / 30))
      .attr("text-anchor", "middle")
      .selectAll("text")
      .data(arcs.filter(d => d.endAngle - d.startAngle > MIN_ANGLE))
      .join("text")
      .attr("transform", d => `translate(${arcLabel.centroid(d)})`)
      .each(function (d) {
        const text = d3.select(this);
        const i = arcs.indexOf(d);

        text.append("tspan")
          .attr("x", 0)
          .attr("dy", "0em")
          .attr("font-weight", "bold")
          .text(names[i]);

        text.append("tspan")
          .attr("x", 0)
          .attr("dy", "1.2em")
          .text(values[i]);
      });

  }, [data, width, height]);

  return <svg ref={ref} />;
}