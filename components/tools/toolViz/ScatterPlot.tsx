import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import D3ColorLegend from './D3ColorLegend';
import { Tooltip } from './ToolTip';
import ModalComponent from '../../ui-comps/ModalComponent';
import MoleculeStructure from '../toolComp/MoleculeStructure';
import { randomInt } from 'mathjs';
import Screenshotter from '../../utils/d3toPNG';

const Scatterplot = ({ data, colorProperty = [], hoverProp = [], xAxisTitle, yAxisTitle, id = [] }) => {
  const margin = { top: 10, right: 20, bottom: 60, left: 70 };

  const parentRef = useRef(null);
  const svgRef = useRef();
  const [details, setDetails] = useState(null);

  const [dimensions, setDimensions] = useState({ width: 300, height: 300 });
  const [selectedColorScale, setSelectedColorScale] = useState('Viridis');

  const [bubbleSize, setBubbleSize] = useState(8);

  const [modalState, setModalState] = useState(false);
  const [modalDets, setModalDets] = useState<any>(false)

  const colorScales = {
    Viridis: d3.interpolateViridis,
    Blues: d3.interpolateBlues,
    Reds: d3.interpolateReds,
    Greens: d3.interpolateGreens,
    Spectral: d3.interpolateSpectral,
    Rainbow: d3.interpolateRainbow,
    Sinebow: d3.interpolateSinebow,
    Yellow_Green_Blue: d3.interpolateYlGnBu
  };

  const colorScaler = d3.scaleSequential().domain([Math.max(...colorProperty), Math.min(...colorProperty)]).interpolator(colorScales[selectedColorScale]);

  const handleColorScaleChange = (event) => {
    setSelectedColorScale(event.target.value);
  };

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

  useEffect(() => {
    if (dimensions.width === 0 && dimensions.height === 0) {
      getSvgContainerSize();
    }
    const width = dimensions.width - margin.left - margin.right;
    const height = Math.min(dimensions.height, window.innerHeight - 100) - margin.top - margin.bottom;

    const handleMouseOver = (event, d) => {
      const [x, y] = d3.pointer(event);
      setDetails({
        xPos: x,
        yPos: y,
        name: hoverProp[data.indexOf(d)],
      });
    };

    const handleMouseEnd = () => {
      setDetails(null);
    };

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const zoom = d3.zoom()
      .scaleExtent([0.5, 20])
      .extent([[0, 0], [width, height]])
      .on('zoom', updateChart);

    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .style('fill', 'none')
      .style('pointer-events', 'all')
      .attr('transform', `translate(${margin.left},${margin.top})`)
      .call(zoom);

    function updateChart(event) {
      const newX = event.transform.rescaleX(x);
      const newY = event.transform.rescaleY(y);

      xAxis.call(d3.axisBottom(newX).tickSize(-height));
      yAxis.call(d3.axisLeft(newY).tickSize(-width));

      xAxis.selectAll('.tick line') // Select all the grid lines
        .style('opacity', 0.2);

      yAxis.selectAll('.tick line') // Select all the grid lines
        .style('opacity', 0.2);

      yAxis.selectAll('text') // Select all the text elements for x-axis ticks
        .style('font-size', '1.5em');

      xAxis.selectAll('text') // Select all the text elements for x-axis ticks
        .style('font-size', '1.5em');

      scatter
        .selectAll('circle')
        .attr('cx', (d) => newX(d.x))
        .attr('cy', (d) => newY(d.y));
    }

    const x = d3.scaleLinear()
      .domain([d3.min(data, d => d.x), d3.max(data, d => d.x)])
      .range([0, width]);
    const xAxis = svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickSize(-height))

    xAxis.selectAll('.tick line') // Select all the grid lines
      .style('opacity', 0.2);


    xAxis.selectAll('text') // Select all the text elements for x-axis ticks
      .style('font-size', '1.5em');

    const y = d3.scaleLinear()
      .domain([d3.min(data, d => d.y), d3.max(data, d => d.y)])
      .range([height, 0]);
    const yAxis = svg.append('g')
      .call(d3.axisLeft(y).tickSize(-width))

    yAxis.selectAll('.tick line') // Select all the grid lines
      .style('opacity', 0.2);


    yAxis.selectAll('text') // Select all the text elements for x-axis ticks
      .style('font-size', '1.5em');

    svg.append('defs').append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('x', 0)
      .attr('y', 0);
    const scatter = svg.append('g').attr('clip-path', 'url(#clip)');

    scatter
      .selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', (d) => x(d.x))
      .attr('cy', (d) => y(d.y))
      .attr('r', bubbleSize)
      .style('fill', (_, i) => colorProperty.length > 0 ? colorScaler(colorProperty[i]) : 'blue') // Use a default color if colorProperty is not provided
      .style('opacity', 0.5)
      .on('mouseenter', hoverProp.length > 0 ? handleMouseOver : null) // Conditionally attach mouseover handler
      .on('mouseleave', hoverProp.length > 0 ? handleMouseEnd : null) // Conditionally attach mouseleave handler
      .on('click', hoverProp.length > 0 ? (_, d) => findModalDetails(event, d) : null); // Conditionally attach click handler

    svg.append('text')
      .attr('transform', `translate(${width / 2},${height + margin.top + 40})`)
      .style('text-anchor', 'middle')
      .style('fill', 'var(--text-color)')
      .style('font-size', '1.2em')
      .text(xAxisTitle);

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - height / 2)
      .attr('dy', '1.4em')
      .style('text-anchor', 'middle')
      .style('fill', 'var(--text-color)')
      .style('font-size', '1.2em')
      .text(yAxisTitle);
  }, [data, dimensions, selectedColorScale, bubbleSize]);

  async function findModalDetails(_, d) {
    await setModalDets({
      activity: colorProperty[data.indexOf(d)],
      canonical_smiles: hoverProp[data.indexOf(d)],
      id: id[data.indexOf(d)],
    });
    setModalState(true)
  }

  return (
    <div className='container' ref={parentRef}>
      {colorProperty.length > 0 && <D3ColorLegend colorScale={colorScaler} width={dimensions.width} />}
      <svg id="dataviz_axisZoom" ref={svgRef}
        height={Math.min(dimensions.height, window.innerHeight - 100)}
        width={dimensions.width}
      ></svg>
      <Screenshotter svgRef={svgRef} />
      <Tooltip interactionData={details} />
      <ModalComponent width='50' isOpen={modalState} closeModal={() => setModalState(false)}>
        <div className='ml-forms'>
          {modalDets &&
            <div className='ml-forms'>
              <span>Activity: {modalDets.activity}</span>
              <span>ID: {localStorage.getItem("dataSource") === "chembl" ?
                <a href={`https://www.ebi.ac.uk/chembl/compound_report_card/${modalDets.id}/`}>{modalDets.id}</a> : modalDets.id}</span>
              <MoleculeStructure height={500} width={500} structure={modalDets.canonical_smiles} key={randomInt(0, 1000000).toString()} id="smiles" />
            </div>
          }
        </div>
      </ModalComponent>
      <div>
        <br />
        <details>
          <summary>Plot Settings</summary>
          <div className='ml-forms'>

            {colorProperty.length > 0 &&
              <>
                <label htmlFor="colorScaleSelect">Select Color Scale:</label>
                <select className='input' id="colorScaleSelect" onChange={handleColorScaleChange} value={selectedColorScale}>
                  {Object.keys(colorScales).map((scale) => (
                    <option key={scale} value={scale}>
                      {scale}
                    </option>
                  ))}
                </select>
              </>
            }
            <label htmlFor="myRange">Select Dot Size:</label>
            <input type="range" min="1" max="10" className="slider" id="myRange" onChange={e => setBubbleSize(parseFloat(e.target.value))}></input>
          </div>
        </details>
      </div>
    </div>
  );
};

export default Scatterplot;
