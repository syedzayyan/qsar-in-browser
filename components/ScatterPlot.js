import { useMemo, useState } from "react";
import * as d3 from 'd3';
import D3ColorLegend from './D3ColorLegend';
import {Tooltip} from './ToolTip'
// tick length
const TICK_LENGTH = 20;

export const AxisBottom = ({
  xScale,
  pixelsPerTick,
  height,
}) => {
  const range = xScale.range();

  const ticks = useMemo(() => {
    const width = range[1] - range[0];
    const numberOfTicksTarget = Math.floor(width / pixelsPerTick);

    return xScale.ticks(numberOfTicksTarget).map((value) => ({
      value,
      xOffset: xScale(value),
    }));
  }, [xScale, height]);

  return (
    <>
      {/* Ticks and labels */}
      {ticks.map(({ value, xOffset }) => (
        <g
          key={value}
          transform={`translate(${xOffset}, 0)`}
          shapeRendering={"crispEdges"}
        >
          <line
            y1={TICK_LENGTH}
            y2={-height - TICK_LENGTH}
            stroke="var(--text-color)"
            strokeWidth={0.5}
          />
          <text
            key={value}
            style={{
              fontSize: "10px",
              textAnchor: "middle",
              transform: "translateY(20px)",
              fill: "var(--text-color)",
            }}
          >
            {value}
          </text>
        </g>
      ))}
    </>
  );
};

export const AxisLeft = ({ yScale, pixelsPerTick, width }) => {
  const range = yScale.range();
  const ticks = useMemo(() => {
    const height = range[0] - range[1];
    const numberOfTicksTarget = Math.floor(height / pixelsPerTick);

    return yScale.ticks(numberOfTicksTarget).map((value) => ({
      value,
      yOffset: yScale(value),
    }));
  }, [yScale]);

  return (
    <>
      {/* Ticks and labels */}
      {ticks.map(({ value, yOffset }) => (
        <g
          key={value}
          transform={`translate(0, ${yOffset})`}
          shapeRendering={"crispEdges"}
        >
          <line
            x1={-TICK_LENGTH}
            x2={width + TICK_LENGTH}
            stroke="var(--text-color)"
            strokeWidth={0.5}
          />
          <text
            key={value}
            style={{
              fontSize: "10px",
              textAnchor: "middle",
              transform: "translateX(-20px)",
              fill: "var(--text-color)",
            }}
          >
            {value}
          </text>
        </g>
      ))}
    </>
  );
};

const MARGIN = { top: 60, right: 60, bottom: 60, left: 60 };

export default function Scatterplot({ width, height, data, hoverProp,
  xAxisTitle = 'Principal Component 1', yAxisTitle = 'Principal Component 2',
  colorProperty = null }) {
  // Layout. The div size is set by the given props.
  // The bounds (=area inside the axis) is calculated by subtracting the margins
  const [hovered, setHovered] = useState(null);

  const boundsWidth = width - MARGIN.right - MARGIN.left;
  const boundsHeight = height - MARGIN.top - MARGIN.bottom;
  const padding = 4;

  const xDomain = [d3.min(data, d => d.y) - padding, d3.max(data, d => d.y) + padding];
  const yDomain = [d3.min(data, d => d.x) - padding, d3.max(data, d => d.x) + padding];

  const xScale = d3.scaleLinear()
    .domain(xDomain)
    .range([0, boundsWidth]);

  const yScale = d3.scaleLinear()
    .domain(yDomain)
    .range([boundsHeight, 0]);


  const colorScale = d3.scaleSequential().domain([1,10])
  .interpolator(d3.interpolateSinebow);
  // Build the shapes
  const allShapes = data.map((d, i) => {
    return (
      <circle
        key={i}
        r={4}
        cx={xScale(d.y)}
        cy={yScale(d.x)}
        opacity={1}
        stroke= {colorProperty == null ? "var(--accent-color)" : colorScale(colorProperty[i])}
        fill={colorProperty == null ? "var(--accent-color)" : colorScale(colorProperty[i])}
        fillOpacity={0.2}
        strokeWidth={1}
        onMouseEnter={() =>
          setHovered({
            xPos: xScale(d.x),
            yPos: yScale(d.y),
            name: hoverProp[i],
          })
        }
        onMouseLeave={() => setHovered(null)}
      />
    );
  });



  return (
    <div style={{ position: "relative" }} className="container">
      <D3ColorLegend />
      <svg width={width} height={height}>
        
        <g
          width={boundsWidth}
          height={boundsHeight}
          transform={`translate(${[MARGIN.left, MARGIN.top].join(',')})`}
        >
          {/* Y axis */}
          <AxisLeft yScale={yScale} pixelsPerTick={40} width={boundsWidth} />
          {/* X axis, use an additional translation to appear at the bottom */}
          <g
            transform={`translate(0, ${boundsHeight})`}
          >
            <AxisBottom
              xScale={xScale}
              pixelsPerTick={40}
              height={boundsHeight}
            />
          </g>

          {/* Axis Titles */}
          <text
            x={boundsWidth / 2}
            y={boundsHeight + MARGIN.top - 10}
            textAnchor="middle"
            style={{ fontSize: "14px", fill: "var(--text-color)" }}
          >
            {xAxisTitle}
          </text>
          <text
            transform={`translate(${-MARGIN.left + 20},${boundsHeight / 2}) rotate(-90)`}
            textAnchor="middle"
            style={{ fontSize: "14px", fill: "var(--text-color)" }}
          >
            {yAxisTitle}
          </text>

          {/* Circles */}
          {allShapes}
        </g>
      </svg>
      <Tooltip interactionData={hovered} />
    </div>
  );
}
