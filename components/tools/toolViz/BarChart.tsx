import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import Screenshotter from "../../utils/d3toPNG";

type GroupedBarChartProps = {
  mae: number[];
  r2?: number[];
  children?: React.ReactNode;
};

const GroupedBarChart: React.FC<GroupedBarChartProps> = ({ mae, r2 = [], children }) => {
  if (!mae || !r2 || mae.length !== r2.length) {
    return <div style={{ color: "#b71c1c" }}>Error: Both mae and r2 arrays are required and must have the same length.</div>;
  }

  const parentRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 640, height: 360 });

  // Resize observer for responsive behaviour
  useEffect(() => {
    if (!parentRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        setSize({
          width: Math.max(320, Math.floor(cr.width)),
          height: Math.max(200, Math.floor(Math.min(520, cr.height || 360))),
        });
      }
    });
    ro.observe(parentRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !parentRef.current) return;

    // Clear only inner groups (we keep the svg element)
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Visual constants
    const margin = { top: 48, right: 70, bottom: 48, left: 72 };
    const width = Math.max(240, size.width - margin.left - margin.right);
    const height = Math.max(120, size.height - margin.top - margin.bottom);

    // Append defs for subtle shadow
    svg.append("defs")
      .html(`
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.18" />
        </filter>
      `);

    const root = svg
      .attr("width", size.width)
      .attr("height", size.height)
      .attr("viewBox", `0 0 ${size.width} ${size.height}`)
      .attr("preserveAspectRatio", "xMinYMin meet")
      .style("font-family", "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Prepare data labels
    const folds = mae.map((_, i) => `Fold ${i + 1}`);
    const subgroups = ["MAE", "R²"];

    // scales
    const x = d3.scaleBand<string>().domain(folds).range([0, width]).padding(0.25);
    const xSub = d3.scaleBand<string>().domain(subgroups).range([0, x.bandwidth()]).padding(0.10);

    const maeMax = d3.max(mae) ?? 0;
    const r2Max = d3.max(r2) ?? 1;

    // left Y (MAE) - start at 0
    const yLeft = d3.scaleLinear().domain([0, maeMax === 0 ? 1 : maeMax * 1.1]).nice().range([height, 0]);
    // right Y (R2) - cap to 1.0 (R² is typically <=1)
    const yRight = d3.scaleLinear().domain([0, Math.min(1, r2Max) === 0 ? 1 : Math.min(1, r2Max) * 1.05]).nice().range([height, 0]);

    // Axes groups
    const xAxisG = root.append("g").attr("transform", `translate(0, ${height})`).attr("class", "x-axis");
    const yAxisLeftG = root.append("g").attr("class", "y-axis-left");
    const yAxisRightG = root.append("g").attr("transform", `translate(${width},0)`).attr("class", "y-axis-right");

    // Draw axes
    xAxisG.call(d3.axisBottom(x).tickSize(0)).selectAll("text").style("font-size", "12px");
    yAxisLeftG.call(d3.axisLeft(yLeft).ticks(5)).selectAll("text").style("font-size", "12px");
    yAxisRightG.call(d3.axisRight(yRight).ticks(5, ".2f")).selectAll("text").style("font-size", "12px");

    // Axis labels
    yAxisLeftG.append("text")
      .attr("x", -margin.left + 6)
      .attr("y", -10)
      .attr("fill", "#222")
      .style("font-weight", 600)
      .style("font-size", "12px")
      .text("MAE");

    yAxisRightG.append("text")
      .attr("x", 0)
      .attr("y", -10)
      .attr("fill", "#222")
      .style("font-weight", 600)
      .style("font-size", "12px")
      .attr("text-anchor", "end")
      .text("R²");

    // gridlines for left axis
    root.append("g")
      .attr("class", "gridlines")
      .selectAll("line")
      .data(yLeft.ticks(5))
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", d => yLeft(d))
      .attr("y2", d => yLeft(d))
      .attr("stroke", "#eaeaea")
      .attr("stroke-width", 1);

    // color scale
    const color = d3.scaleOrdinal<string>().domain(subgroups).range(["#6c5ce7", "#00a3ff"]);

    // Tooltip
    const parent = d3.select(parentRef.current);
    let tooltipEl = tooltipRef.current;
    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.style.position = "absolute";
      tooltipEl.style.pointerEvents = "none";
      tooltipEl.style.padding = "6px 8px";
      tooltipEl.style.borderRadius = "6px";
      tooltipEl.style.fontSize = "12px";
      tooltipEl.style.background = "rgba(20,20,20,0.85)";
      tooltipEl.style.color = "white";
      tooltipEl.style.opacity = "0";
      tooltipEl.style.transition = "opacity 120ms ease";
      tooltipEl.style.zIndex = "999";
      tooltipRef.current = tooltipEl;
      parent.node()?.appendChild(tooltipEl);
    }

    // container for groups
    const groups = root.selectAll(".fold-group").data(folds, (d: any) => d);

    // ENTER groups
    const groupsEnter = groups.enter().append("g").attr("class", "fold-group").attr("transform", d => `translate(${x(d)},0)`);

    // Merge (enter + update)
    const groupsMerge = groupsEnter.merge(groups as any);

    // For each fold, append rects for subgroups
    groupsMerge.each(function (_d, i) {
      const g = d3.select(this);
      const values = subgroups.map(key => ({
        key,
        value: key === "MAE" ? mae[i] : r2[i],
      }));

      // Data join for rects inside each group
      const bars = g.selectAll<SVGRectElement, any>("rect.bar").data(values, (d: any) => d.key);

      // EXIT
      bars.exit().transition().duration(200).attr("y", yLeft(0)).attr("height", 0).remove();

      // ENTER
      const barsEnter = bars.enter().append("rect").attr("class", "bar")
        .attr("x", d => xSub(d.key) ?? 0)
        .attr("width", xSub.bandwidth())
        .attr("y", yLeft(0))
        .attr("height", 0)
        .attr("rx", 6)
        .attr("filter", "url(#shadow)")
        .style("fill", d => color(d.key));

      // ENTER + UPDATE
      barsEnter.merge(bars as any)
        .on("mouseenter", (event, d) => {
          const [mx, my] = d3.pointer(event, parentRef.current);
          tooltipEl!.innerHTML = `<strong>${d.key}</strong>: ${typeof d.value === "number" ? (d.key === "R²" ? d.value.toFixed(3) : d.value.toFixed(3)) : d.value}`;
          tooltipEl!.style.left = `${mx + 12}px`;
          tooltipEl!.style.top = `${my - 8}px`;
          tooltipEl!.style.opacity = "1";
        })
        .on("mousemove", (event) => {
          const [mx, my] = d3.pointer(event, parentRef.current);
          tooltipEl!.style.left = `${mx + 12}px`;
          tooltipEl!.style.top = `${my - 8}px`;
        })
        .on("mouseleave", () => {
          tooltipEl!.style.opacity = "0";
        })
        .transition()
        .duration(450)
        .attr("x", d => xSub(d.key) ?? 0)
        .attr("width", xSub.bandwidth())
        .attr("y", (d) => (d.key === "MAE" ? yLeft(d.value) : yRight(d.value)))
        .attr("height", (d) => (d.key === "MAE" ? Math.max(0, height - yLeft(d.value)) : Math.max(0, height - yRight(d.value))))
        .style("fill", d => color(d.key));

    });

    // Remove groups that disappeared
    groups.exit().remove();

    // Legend (top-right)
// Top-center legend
const legend = root.append("g")
  .attr("class", "legend")
  .attr("transform", `translate(${width / 2}, -30)`); // top-center

const legendSpacing = 60; // space between items
const rectWidth = 24;
const rectHeight = 12;

// center the whole legend group
legend.selectAll(".legend-item")
  .data(subgroups)
  .enter()
  .append("g")
  .attr("class", "legend-item")
  .attr("transform", (_d, i) => `translate(${i * legendSpacing - ((subgroups.length - 1) * legendSpacing) / 2}, 0)`)
  .each(function(d) {
    const g = d3.select(this);

    // text above the color box
    g.append("text")
      .attr("x", rectWidth / 2)
      .attr("y", 0)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "hanging")
      .style("font-size", "12px")
      .style("font-weight", 600)
      .text(d);

    // colored rectangle
    g.append("rect")
      .attr("x", 0)
      .attr("y", 16) // below the text
      .attr("width", rectWidth)
      .attr("height", rectHeight)
      .attr("rx", 3)
      .attr("fill", color(d));
  });


    // Title (suave)
    root.append("text")
      .attr("x", 0)
      .attr("y", -28)
      .style("font-size", "14px")
      .style("font-weight", 700)
      .text("Fold-wise MAE & R²")
      .style("fill", "#222");

    // Clean up tooltip on unmount
    return () => {
      if (tooltipRef.current && tooltipRef.current.parentNode) {
        tooltipRef.current.parentNode.removeChild(tooltipRef.current);
        tooltipRef.current = null;
      }
    };
  }, [mae, r2, size.width, size.height]);

  return (
    <div ref={parentRef} style={{ width: "100%", height: "100%", minHeight: 260, position: "relative" }}>
      {children}
      <svg ref={svgRef} style={{ display: "block", width: "100%", height: "100%" }} />
      <Screenshotter svgRef={svgRef} />
    </div>
  );
};

export default GroupedBarChart;
