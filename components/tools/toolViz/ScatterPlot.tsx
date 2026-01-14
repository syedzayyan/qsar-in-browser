import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import MoleculeStructure from '../toolComp/MoleculeStructure';
import { randomInt } from 'mathjs';
import Screenshotter from '../../utils/d3toPNG';
import { Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

// Updated Scatterplot: modernized, responsive and with a full-width color legend
export default function Scatterplot({ data, colorProperty = [], hoverProp = [], xAxisTitle = '', yAxisTitle = '', id = [] }) {
  const margin = { top: 10, right: 20, bottom: 80, left: 80 };
  const parentRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [details, setDetails] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [modalDets, setModalDets] = useState<any>(false);

  // visual state
  const [bubbleSize, setBubbleSize] = useState(6);
  const [selectedColorScale, setSelectedColorScale] = useState('Viridis');
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

  // Responsive size stored as outer (svg) and inner (chart) dims
  const [outerSize, setOuterSize] = useState({ width: 600, height: 420 });

  // use ResizeObserver for immediate and robust responsiveness
  useEffect(() => {
    if (!parentRef.current) return;
    const el = parentRef.current;

    const ro = new ResizeObserver(entries => {
      for (let entry of entries) {
        const w = Math.max(300, Math.floor(entry.contentRect.width));
        // keep a pleasant aspect ratio but allow parent to control height if it's taller
        const h = Math.max(300, Math.floor(w * 0.65));
        setOuterSize({ width: w, height: h });
      }
    });

    ro.observe(el);
    // initialize
    const init = el.getBoundingClientRect();
    setOuterSize({ width: Math.max(300, Math.floor(init.width)), height: Math.max(300, Math.floor(init.width * 0.65)) });

    return () => ro.disconnect();
  }, []);

  // utility to build a color scaler (domain min->max)
  const colorDomain = colorProperty.length ? [d3.min(colorProperty), d3.max(colorProperty)] : [0, 1];
  const colorInterpolator = colorScales[selectedColorScale] || d3.interpolateViridis;
  const colorScaler = d3.scaleSequential(colorInterpolator).domain(colorDomain);

  useEffect(() => {
    if (!data || data.length === 0) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const outerWidth = outerSize.width;
    const outerHeight = outerSize.height;
    const width = Math.max(100, outerWidth - margin.left - margin.right);
    const height = Math.max(100, outerHeight - margin.top - margin.bottom);

    // create a unique id for defs so that multiple charts won't clash
    const uid = `legend-${Math.random().toString(36).slice(2, 9)}`;

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${outerWidth} ${outerHeight}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', `${outerHeight}px`)
      .style('display', 'block');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // defs: shadow filter + gradient container for legend
    const defs = svg.append('defs');

    // linear gradient for legend
    const grad = defs.append('linearGradient').attr('id', `${uid}-grad`)
      .attr('x1', '0%').attr('x2', '100%').attr('y1', '0%').attr('y2', '0%');

    // create a set of stops to approximate the interpolator
    const stopCount = 12;
    for (let i = 0; i <= stopCount; i++) {
      grad.append('stop')
        .attr('offset', `${(i / stopCount) * 100}%`)
        .attr('stop-color', colorInterpolator(i / stopCount));
    }

    // scales
    const x = d3.scaleLinear()
      .domain(d3.extent(data, d => d.x))
      .nice()
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain(d3.extent(data, d => d.y))
      .nice()
      .range([height, 0]);

    // axes + grid
    const xAxis = g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(Math.min(8, Math.floor(width / 80))).tickSize(-height));

    const yAxis = g.append('g')
      .call(d3.axisLeft(y).ticks(Math.min(8, Math.floor(height / 60))).tickSize(-width));

    // style grid and ticks to be subtle
    xAxis.selectAll('.tick line').style('opacity', 0.12);
    yAxis.selectAll('.tick line').style('opacity', 0.12);
    xAxis.selectAll('text').style('font-size', '0.95rem').style('fill', 'var(--text-color)');
    yAxis.selectAll('text').style('font-size', '0.95rem').style('fill', 'var(--text-color)');

    // axis labels
    g.append('text')
      .attr('transform', `translate(${width / 2},${height + 30})`)
      .style('text-anchor', 'middle')
      .style('fill', 'var(--text-color)')
      .style('font-size', '1rem')
      .text(xAxisTitle);

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left + 30)
      .attr('x', 0 - height / 2)
      .attr('dy', '1.2em')
      .style('text-anchor', 'middle')
      .style('fill', 'var(--text-color)')
      .style('font-size', '1rem')
      .text(yAxisTitle);

    // clipping for scatter
    svg.append('defs').append('clipPath').attr('id', `${uid}-clip`)
      .append('rect').attr('width', width).attr('height', height).attr('x', margin.left).attr('y', margin.top);

    const scatter = g.append('g').attr('clip-path', `url(#${uid}-clip)`);

    // nice dot styling: pop with white stroke and subtle glow filter
    scatter.selectAll('circle')
      .data(data)
      .join('circle')
      .attr('cx', d => x(d.x))
      .attr('cy', d => y(d.y))
      .attr('r', bubbleSize)
      .attr('fill', (_, i) => colorProperty.length ? colorScaler(colorProperty[i]) : '#6b7280')
      .attr('stroke', 'white')
      .attr('stroke-width', 0.7)
      .attr('opacity', 0.95)
      .on('mouseenter', function (event, d) {
        d3.select(this).raise().transition().duration(150).attr('r', bubbleSize * 1.8).attr('opacity', 1);
        const [mx, my] = d3.pointer(event, svg.node());
        setDetails({ xPos: mx - margin.left, yPos: my - margin.top, name: hoverProp[data.indexOf(d)] });
      })
      .on('mouseleave', function () {
        d3.select(this).transition().duration(150).attr('r', bubbleSize).attr('opacity', 0.95);
        setDetails(null);
      })
      .on('click', (_, d) => {
        setModalDets({
          activity: colorProperty[data.indexOf(d)],
          canonical_smiles: hoverProp[data.indexOf(d)],
          id: id[data.indexOf(d)],
        });
        open();
      });

    // zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 20])
      .extent([[0, 0], [width, height]])
      .on('zoom', (event) => {
        const newX = event.transform.rescaleX(x);
        const newY = event.transform.rescaleY(y);

        xAxis.call(d3.axisBottom(newX).ticks(Math.min(8, Math.floor(width / 80))).tickSize(-height));
        yAxis.call(d3.axisLeft(newY).ticks(Math.min(8, Math.floor(height / 60))).tickSize(-width));

        scatter.selectAll('circle')
          .attr('cx', d => newX(d.x))
          .attr('cy', d => newY(d.y));

        xAxis.selectAll('.tick line').style('opacity', 0.12);
        yAxis.selectAll('.tick line').style('opacity', 0.12);
      });

    svg.call(zoom);

    // --- Color legend: a full-width rectangle that exactly spans the inner chart width ---
    const legendHeight = 8;
    const legendMarginTop = height + 48; // slightly smaller gap for visibility

    // Gradient bar
    g.append('rect')
      .attr('x', 0)
      .attr('y', legendMarginTop)
      .attr('width', width)
      .attr('height', legendHeight)
      .attr('rx', 3)
      .style('fill', `url(#${uid}-grad)`)
      .style('stroke', 'rgba(0,0,0,0.1)')
      .style('stroke-width', 0.6);

    if (colorProperty.length) {
      const legendScale = d3.scaleLinear()
        .domain(colorDomain)
        .range([0, width]);

      const legendAxis = d3.axisBottom(legendScale)
        .ticks(6)
        .tickSize(6)
        .tickFormat(d3.format('.2~f'));

      g.append('g')
        .attr('transform', `translate(0,${legendMarginTop + legendHeight + 2})`) // small +2 for gap
        .call(legendAxis)
        .call(g => g.select('.domain').remove()) // remove axis line for cleaner look
        .selectAll('text')
        .style('font-size', '0.85rem')
    }


  }, [data, outerSize, selectedColorScale, bubbleSize, colorProperty, hoverProp, xAxisTitle, yAxisTitle]);

  function handleColorScaleChange(e) {
    setSelectedColorScale(e.target.value);
  }

  return (
    <div ref={parentRef} className="w-full">
      {/* The old D3ColorLegend has been replaced by an inline legend that spans the inner chart width. */}
      <svg ref={svgRef} />

      <Screenshotter svgRef={svgRef} />
      <Modal opened={opened} onClose={close} size={"lg"}>
        <div className='ml-forms'>
          {modalDets &&
            <div className='ml-forms'>
              <span>Activity: {modalDets.activity.toFixed(2)}</span>
              &nbsp;
              <span>ID: {localStorage.getItem("dataSource") === "chembl" ?
                <a href={`https://www.ebi.ac.uk/chembl/compound_report_card/${modalDets.id}/`}>{modalDets.id}</a> : modalDets.id}</span>
              <MoleculeStructure height={500} width={500} structure={modalDets.canonical_smiles} key={randomInt(0, 1000000).toString()} id="smiles" />
            </div>
          }
        </div>
      </Modal>

      <div>
        <br />
        <details>
          <summary>Plot Settings</summary>
          <div className='ml-forms'>
            {colorProperty.length > 0 &&
              <>
                <label htmlFor="colorScaleSelect">Select Color Scale:</label>
                <select className='input' id="colorScaleSelect" onChange={handleColorScaleChange} value={selectedColorScale}>
                  {Object.keys(colorScales).map(scale => (
                    <option key={scale} value={scale}>{scale}</option>
                  ))}
                </select>
              </>
            }

            <label htmlFor="myRange">Select Dot Size:</label>
            <input type="range" min="1" max="16" className="slider" id="myRange" onChange={e => setBubbleSize(parseFloat(e.target.value))} value={bubbleSize}></input>
          </div>
        </details>
      </div>
    </div>
  );
}
