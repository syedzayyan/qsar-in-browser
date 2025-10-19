import { useContext, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import Card from "./Card";
import MoleculeStructure from "../toolComp/MoleculeStructure";
import Screenshotter from "../../utils/d3toPNG";
import TargetContext from "../../../context/TargetContext";
import { round } from "mathjs";

const MARGIN = { top: 30, right: 30, bottom: 50, left: 80 };
const BUCKET_NUMBER = 70;
const BUCKET_PADDING = 1;

type d_bin = (typeof d3.bins)[number];

type HistogramProps = {
  data: number[];
  xLabel?: string;
  yLabel?: string;
  toolTipData?: any[]; // Update the type as needed
  children?: React.ReactNode; // Make children optional
};

export default function Histogram({
  data,
  xLabel = "",
  yLabel = "",
  toolTipData = [],
  children
} : HistogramProps) {
  const [dimensions, setDimensions] = useState({ width: 300, height: 300 });
  const [modalState, setModalState] = useState(false);
  const [modalDets, setModalDets] = useState([]);
  const { target } = useContext(TargetContext);

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
      .call(xAxisGenerator)
      .selectAll('text') // Select all the text elements for x-axis ticks
      .style('font-size', '1.5em'); 

    // Add X-axis label
    svgElement
      .append("text")
      .attr(
        "transform",
        `translate(${width / 2},${height - MARGIN.bottom + 45})`,
      )
      .style("text-anchor", "middle")
      .style('font-size', '1.5em')
      .text(xLabel);

    // Create Y-axis and position it
    const yAxisGenerator = d3.axisLeft(yScale);
    svgElement
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`)
      .call(yAxisGenerator)
      .selectAll('text') // Select all the text elements for x-axis ticks
      .style('font-size', '1.5em'); 

    // Add Y-axis label
    svgElement
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", MARGIN.left - 70)
      .attr("x", 0 - height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style('font-size', '1.5em')
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
        {children}
        <svg width={width} height={height} ref={svgRef}>
          <g ref={svgRef}></g>
        </svg>
        <Screenshotter svgRef={svgRef}/>
        {/* {modalState && (
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
                  <span>{target.activity_columns[0]}: {round(x[target.activity_columns[0]], 2)} </span>

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
        )} */}
      </div>
    );
  }
}
