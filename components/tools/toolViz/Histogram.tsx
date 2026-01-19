import { useContext, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import MoleculeStructure from "../toolComp/MoleculeStructure";
import Screenshotter from "../../utils/d3toPNG";
import TargetContext from "../../../context/TargetContext";
import { round } from "mathjs";
import { useDisclosure } from "@mantine/hooks";
import { Card, Grid, Modal } from "@mantine/core";

const MARGIN = { top: 40, right: 30, bottom: 60, left: 80 };
const BUCKET_NUMBER = 70;
const BUCKET_PADDING = 1;

type d_bin = (typeof d3.bin)[number];

type HistogramProps = {
  data: number[];
  xLabel?: string;
  yLabel?: string;
  toolTipData?: any[];
  children?: React.ReactNode;
};

export default function Histogram({
  data,
  xLabel = "",
  yLabel = "",
  toolTipData = [],
  children,
}: HistogramProps) {
  const [dimensions, setDimensions] = useState({ width: 300, height: 300 });
  const [opened, { open, close }] = useDisclosure(false);
  const [modalDets, setModalDets] = useState<any[]>([]);
  const { target } = useContext(TargetContext);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const parentRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // color scheme: choose neutral blues and axis/label color adaptive to dark/light
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches : false
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    // older browsers:
    try {
      mq.addEventListener?.("change", handler);
      // @ts-ignore fallback
      if (!mq.addEventListener) mq.addListener(handler);
    } catch {
      // ignore
    }
    return () => {
      try {
        mq.removeEventListener?.("change", handler);
        // @ts-ignore fallback
        if (!mq.removeEventListener) mq.removeListener(handler);
      } catch {
        // ignore
      }
    };
  }, []);

  // responsive: use ResizeObserver on parent for smooth/responsive height/width
  useEffect(() => {
    if (!parentRef.current) return;
    const node = parentRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        const newW = Math.max(120, Math.floor(cr.width));
        // clamp height to be reasonable but allow it to change when user resizes vertical size
        const newH = Math.max(160, Math.min(Math.floor(cr.height || 300), window.innerHeight - 120));
        setDimensions({ width: newW, height: newH });
      }
    });
    ro.observe(node);
    resizeObserverRef.current = ro;
    // initial measure
    const rect = node.getBoundingClientRect();
    setDimensions({
      width: Math.max(120, Math.floor(rect.width || 300)),
      height: Math.max(160, Math.min(Math.floor(rect.height || 300), window.innerHeight - 120)),
    });
    return () => {
      ro.disconnect();
      resizeObserverRef.current = null;
    };
  }, []);

  // create tooltip div once
  useEffect(() => {
    if (!parentRef.current) return;
    if (!tooltipRef.current) {
      const tt = document.createElement("div");
      tt.style.position = "absolute";
      tt.style.pointerEvents = "none";
      tt.style.padding = "6px 10px";
      tt.style.borderRadius = "6px";
      tt.style.background = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.75)";
      tt.style.color = isDark ? "#f8fafc" : "#fff";
      tt.style.fontSize = "0.9rem";
      tt.style.opacity = "0";
      tooltipRef.current = tt;
      parentRef.current.appendChild(tt);
    } else {
      // update background/text color when theme changes
      const tt = tooltipRef.current;
      tt.style.background = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.75)";
      tt.style.color = isDark ? "#f8fafc" : "#fff";
    }
  }, [isDark]);

  if (!data || data.length === 0)
    return (
      <div ref={parentRef} style={{ position: "relative", width: "100%", height: "100%" }}>
        {children}
        <div style={{ padding: 12 }}>No data</div>
      </div>
    );

  const width = dimensions.width;
  const height = dimensions.height;

  const boundsWidth = Math.max(100, width - MARGIN.left - MARGIN.right);
  const boundsHeight = Math.max(80, height - MARGIN.top - MARGIN.bottom);

  // X scale
  const xScale = useMemo(() => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const padding = Math.abs(max - min) < 1e-9 ? Math.abs(max) * 0.1 + 1 : Math.abs(max - min) * 0.04;
    return d3.scaleLinear().domain([min - padding, max + padding]).range([0, boundsWidth]).nice();
  }, [data, boundsWidth]);

  // buckets
  const bucketGenerator = useMemo(() => {
    return d3.bin<number>().value((d) => d).domain(xScale.domain() as [number, number]).thresholds(xScale.ticks(BUCKET_NUMBER));
  }, [xScale]);

  const buckets = useMemo(() => bucketGenerator(data), [bucketGenerator, data]);

  // y scale
  const yScale = useMemo(() => {
    const max = d3.max(buckets, (b) => b.length) || 0;
    return d3.scaleLinear().range([boundsHeight, 0]).domain([0, max]).nice();
  }, [buckets, boundsHeight]);

  // draw chart
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // neutral blue gradient (suitable for light/dark)
    const defs = svg.append("defs");
    const grad = defs.append("linearGradient").attr("id", "histBlueGradient").attr("x1", "0%").attr("x2", "0%").attr("y1", "0%").attr("y2", "100%");
    // gentle neutral blue stops
    grad.append("stop").attr("offset", "0%").attr("stop-color", "#89b4fa"); // light blue
    grad.append("stop").attr("offset", "100%").attr("stop-color", "#2b6cb0"); // mid/darker blue

    // subtle shadow filter
    const filter = defs.append("filter").attr("id", "softShadow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    filter.append("feDropShadow").attr("dx", 0).attr("dy", 2).attr("stdDeviation", 4).attr("flood-opacity", isDark ? 0.28 : 0.12);

    // container group
    const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    // gridlines - faint
    const yAxisGrid = d3.axisLeft(yScale).ticks(5).tickSize(-boundsWidth).tickFormat(() => "");
    g.append("g")
      .attr("class", "grid")
      .call(yAxisGrid)
      .selectAll("line")
      .attr("stroke", isDark ? "#123240" : "#e6eef0");

    // bars group
    const bars = g.append("g").attr("class", "bars");

    const rects = bars.selectAll("rect").data(buckets, (d: any) => `${d.x0}-${d.x1}`);

    rects
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("x", (d: d_bin) => xScale(d.x0) + BUCKET_PADDING / 2)
            .attr("y", boundsHeight)
            .attr("width", (d: d_bin) => Math.max(0, xScale(d.x1) - xScale(d.x0) - BUCKET_PADDING))
            .attr("height", 0)
            .attr("rx", 4)
            .attr("fill", "url(#histBlueGradient)")
            .attr("filter", "url(#softShadow)")
            .style("cursor", toolTipData.length ? "pointer" : "default")
            .on("mouseenter", function (event, d: d_bin) {
              d3.select(this).attr("transform", "translate(0,-6)").attr("opacity", 0.95);
              const tt = tooltipRef.current;
              if (tt && parentRef.current) {
                tt.innerHTML = `<strong>range:</strong> ${d.x0.toFixed(3)} — ${d.x1.toFixed(3)}<br/><strong>count:</strong> ${d.length}`;
                const parentRect = parentRef.current.getBoundingClientRect();
                tt.style.left = `${event.clientX - parentRect.left + 12}px`;
                tt.style.top = `${event.clientY - parentRect.top + 8}px`;
                tt.style.opacity = "1";
                tt.style.transform = "translateY(-4px)";
              }
            })
            .on("mousemove", function (event) {
              const tt = tooltipRef.current;
              if (tt && parentRef.current) {
                const parentRect = parentRef.current.getBoundingClientRect();
                tt.style.left = `${event.clientX - parentRect.left + 12}px`;
                tt.style.top = `${event.clientY - parentRect.top + 8}px`;
              }
            })
            .on("mouseleave", function () {
              d3.select(this).attr("transform", "translate(0,0)").attr("opacity", 1);
              const tt = tooltipRef.current;
              if (tt) {
                tt.style.opacity = "0";
                tt.style.transform = "translateY(0)";
              }
            })
            .on("click", function (event, d: d_bin) {
              if (toolTipData.length > 0) {
                const indexesWithinRange = data.reduce<number[]>((acc, value, index) => {
                  if (value >= d.x0 && value <= d.x1) acc.push(index);
                  return acc;
                }, []);
                const resultArr = indexesWithinRange.map((i) => toolTipData[i]);
                setModalDets(resultArr);
                open();
              }
              event.stopPropagation();
            }),
        (update) => update,
        (exit) => exit.remove()
      )
      .attr("y", (d: d_bin) => yScale(d.length))
      .attr("height", (d: d_bin) => Math.max(0, boundsHeight - yScale(d.length)));

    // NOTE: removed per-bar numeric labels (as requested)

    // axes
    const xAxis = d3.axisBottom(xScale).ticks(Math.min(10, Math.ceil(boundsWidth / 70))).tickPadding(8);
    const yAxis = d3.axisLeft(yScale).ticks(5).tickPadding(8);

    const axisTextColor = isDark ? "#4490a1ff" : "#0f172a"; // light text in dark mode, dark text in light mode

    g.append("g")
      .attr("transform", `translate(0, ${boundsHeight})`)
      .call(xAxis)
      .selectAll("text")
      .attr("font-size", Math.max(11, Math.min(14, boundsWidth / 80)))
      .attr("fill", axisTextColor);

    g.append("g")
      .call(yAxis)
      .selectAll("text")
      .attr("font-size", Math.max(11, Math.min(14, boundsWidth / 80)))
      .attr("fill", axisTextColor);

    // axis labels
    svg.append("text")
      .attr("transform", `translate(${MARGIN.left + boundsWidth / 2}, ${height - 10})`)
      .style("text-anchor", "middle")
      .style("font-size", Math.max(12, Math.min(16, boundsWidth / 60)))
      .style("fill", axisTextColor)
      .text(xLabel);

    svg.append("text")
      .attr("transform", `rotate(-90)`)
      .attr("y", 12)
      .attr("x", 0 - (MARGIN.top + boundsHeight / 2))
      .style("text-anchor", "middle")
      .style("font-size", Math.max(12, Math.min(16, boundsWidth / 60)))
      .style("fill", axisTextColor)
      .text(yLabel);

    // subtle decoration with neutral tint (keeps legend/point count but subdued)
    svg.append("rect")
      .attr("x", MARGIN.left + boundsWidth - 140)
      .attr("y", 6)
      .attr("rx", 8)
      .attr("width", 120)
      .attr("height", 26)
      .attr("fill", isDark ? "rgba(255,255,255,0.03)" : "rgba(43,108,176,0.06)");

    svg.append("text")
      .attr("x", MARGIN.left + boundsWidth - 80)
      .attr("y", 24)
      .style("font-size", 12)
      .style("fill", isDark ? "#cfeff7" : "#2b6cb0")
      .style("font-weight", 600)
      .text(`${data.length} points`);
  }, [xScale, yScale, buckets, boundsWidth, boundsHeight, height, data, toolTipData, open, isDark]);

  return (
    <div ref={parentRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      {children}
      <svg ref={svgRef} width={width} height={height} role="img" aria-label="Histogram chart" />
      <Screenshotter svgRef={svgRef} />
      <Modal opened={opened} onClose={close} size="75rem">
        <Grid>
          {modalDets.map((x, i) => (
            <Grid.Col key={i} span={4}>
              <Card key={i} shadow="sm" padding="lg" radius="md" withBorder>
                <MoleculeStructure structure={x.canonical_smiles} id={i.toString()} />
                <div style={{ marginTop: 8 }}>
                  <span>
                    {target.activity_columns[0]}: {round(x[target.activity_columns[0]], 2)}
                  </span>
                </div>
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  <span>
                    ID:{" "}
                    {localStorage.getItem("dataSource") === "chembl" ? (
                      <a
                        href={`https://www.ebi.ac.uk/chembl/compound_report_card/${x.id}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {x.id}
                      </a>
                    ) : (
                      x.id
                    )}
                  </span>
                </div>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      </Modal>
    </div>
  );
}
