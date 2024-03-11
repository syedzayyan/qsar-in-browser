import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import ModalComponent from "../../ui-comps/ModalComponent";
import Card from "./Card";
import MoleculeStructure from "../toolComp/MoleculeStructure";

const MARGIN = { top: 30, right: 30, bottom: 40, left: 50 };
const BUCKET_NUMBER = 70;
const BUCKET_PADDING = 1;

type d_bin = (typeof d3.bins)[number];

export default function Histogram({
  data,
  xLabel = "",
  yLabel = "",
  toolTipData = [],
}) {
  const [dimensions, setDimensions] = useState({ width: 300, height: 300 });
  const [modalState, setModalState] = useState(false);
  const [modalDets, setModalDets] = useState([]);

  const svgRef = useRef(null);
  const parentRef = useRef(null);

  const getSvgContainerSize = () => {
    const newWidth = parentRef.current.clientWidth;
    const newHeight = parentRef.current.clientHeight;
    setDimensions({ width: newWidth, height: newHeight });
  };

  useEffect(() => {
    getSvgContainerSize();
    window.addEventListener("resize", getSvgContainerSize);

    return () => window.removeEventListener("resize", getSvgContainerSize);
  }, []);

  if (dimensions.width === 0 && dimensions.height === 0) {
    getSvgContainerSize();
  }

  const width = dimensions.width;
  const height = Math.min(dimensions.height, window.innerHeight - 100);

  const boundsWidth = width - 100 - MARGIN.right - MARGIN.left;
  const boundsHeight = height - MARGIN.top - MARGIN.bottom;

  // Create X scale based on the data
  const xScale = useMemo(() => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    return d3
      .scaleLinear()
      .domain([min - min * 0.04, max + max * 0.04])
      .range([0, boundsWidth]);
  }, [data, boundsWidth]);

  // Create a bucket generator for the histogram
  const bucketGenerator = useMemo(() => {
    return d3
      .bin()
      .value((d: d_bin) => d)
      .domain(xScale.domain())
      .thresholds(xScale.ticks(BUCKET_NUMBER));
  }, [xScale]);
  // Generate histogram buckets based on the data
  const buckets = useMemo(() => bucketGenerator(data), [bucketGenerator, data]);

  // Create Y scale based on the histogram buckets
  const yScale = useMemo(() => {
    const max = d3.max(buckets, (bucket: d_bin) => bucket.length);
    return d3
      .scaleLinear()
      .range([boundsHeight, 0])
      .domain([0, max || 0])
      .nice();
  }, [buckets, boundsHeight]);

  // Effect to update the chart when the scales or data change
  // Effect to update the chart when the scales or data change
  useEffect(() => {
    // Select the SVG element
    const svgElement = d3.select(svgRef.current);

    // Remove existing elements within the SVG
    svgElement.selectAll("*").remove();

    // Create X-axis and position it
    const xAxisGenerator = d3.axisBottom(xScale);
    svgElement
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${height - MARGIN.bottom})`)
      .call(xAxisGenerator);

    // Add X-axis label
    svgElement
      .append("text")
      .attr(
        "transform",
        `translate(${width / 2},${height - MARGIN.bottom + 30})`,
      )
      .style("text-anchor", "middle")
      .text(xLabel);

    // Create Y-axis and position it
    const yAxisGenerator = d3.axisLeft(yScale);
    svgElement
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`)
      .call(yAxisGenerator);

    // Add Y-axis label
    svgElement
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", MARGIN.left - 40)
      .attr("x", 0 - height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text(yLabel);

    svgElement
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`)
      .selectAll("rect")
      .data(buckets)
      .join("rect")
      .attr("x", (d: d_bin) => xScale(d.x0) + BUCKET_PADDING / 2)
      .attr("width", (d: d_bin) =>
        Math.max(0, xScale(d.x1) - xScale(d.x0) - BUCKET_PADDING),
      )
      .attr("y", (d: d_bin) => yScale(d.length))
      .attr("height", (d: d_bin) => boundsHeight - yScale(d.length))
      .attr("fill", "#69b3a2")
      .on("click", (d: d_bin) => handleClick(d));

    function handleClick(event) {
      if (toolTipData.length > 0) {
        const clickedData = d3.select(event.currentTarget).data()[0];
        const indexesWithinRange = data.reduce((acc, value, index) => {
          if (value >= clickedData.x0 && value <= clickedData.x1) {
            acc.push(index);
          }
          return acc;
        }, []);
        let resultArr = indexesWithinRange.map((i) => toolTipData[i]);
        setModalDets(resultArr);
        setModalState(true);
      }
    }
  }, [xScale, yScale, buckets, dimensions]);

  if (data === undefined) {
    return <></>;
  } else {
    return (
      <div className="container" ref={parentRef}>
        <svg width={width} height={height} ref={svgRef}>
          <g ref={svgRef}></g>
        </svg>
        {modalState && (
          <ModalComponent
            isOpen={modalState}
            closeModal={() => setModalState(false)}
          >
            <>
              {modalDets.map((x, i) => (
                <Card>
                  <MoleculeStructure
                    structure={x.canonical_smiles}
                    id={i.toString()}
                  />
                  <span>Activity: {x.neg_log_activity_column} </span>

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
                </Card>
              ))}
            </>
          </ModalComponent>
        )}
      </div>
    );
  }
}
