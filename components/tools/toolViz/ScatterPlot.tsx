import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import MoleculeStructure from '../toolComp/MoleculeStructure';
import { randomInt } from 'mathjs';
import Screenshotter from '../../utils/d3toPNG';
import { Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

interface ScatterplotProps {
  data: { x: number; y: number }[];
  colorProperty?: number[];
  hoverProp?: string[];
  xAxisTitle?: string;
  yAxisTitle?: string;
  id?: string[];
  discreteColor?: boolean;
  onSelectIndices?: (indices: number[]) => void
}

interface Details {
  xPos: number;
  yPos: number;
  name: string;
}

interface ModalDets {
  activity: number;
  canonical_smiles: string;
  id: string;
}

export default function Scatterplot({
  data,
  colorProperty = [],
  hoverProp = [],
  xAxisTitle = '',
  yAxisTitle = '',
  id = [],
  discreteColor = false
}: ScatterplotProps) {
  const margin = { top: 10, right: 20, bottom: 80, left: 80 };
  const parentRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [details, setDetails] = useState<Details | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [modalDets, setModalDets] = useState<ModalDets | null>(null);

  const [bubbleSize, setBubbleSize] = useState(6);
  const [selectedColorScale, setSelectedColorScale] = useState('Viridis');
  
  
  
  const colorScales: Record<string, (t: number) => string> = {
    Viridis: d3.interpolateViridis,
    Blues: d3.interpolateBlues,
    Reds: d3.interpolateReds,
    Greens: d3.interpolateGreens,
    Spectral: d3.interpolateSpectral,
    Rainbow: d3.interpolateRainbow,
    Sinebow: d3.interpolateSinebow,
    Yellow_Green_Blue: d3.interpolateYlGnBu
  };

  const [outerSize, setOuterSize] = useState({ width: 600, height: 420 });

  // ResizeObserver for responsiveness
  useEffect(() => {
    if (!parentRef.current) return;
    const el = parentRef.current;

    const ro = new ResizeObserver(entries => {
      for (let entry of entries) {
        const w = Math.max(300, Math.floor(entry.contentRect.width));
        const h = Math.max(300, Math.floor(w * 0.65));
        setOuterSize({ width: w, height: h });
      }
    });

    ro.observe(el);
    const init = el.getBoundingClientRect();
    setOuterSize({ width: Math.max(300, Math.floor(init.width)), height: Math.max(300, Math.floor(init.width * 0.65)) });

    return () => ro.disconnect();
  }, []);

  const colorDomain = colorProperty.length ? [d3.min(colorProperty)!, d3.max(colorProperty)!] : [0, 1];
  const colorInterpolator = colorScales[selectedColorScale] || d3.interpolateViridis;
  const colorScaler = d3.scaleSequential(colorInterpolator).domain(colorDomain);

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const outerWidth = outerSize.width;
    const outerHeight = outerSize.height;
    const width = Math.max(100, outerWidth - margin.left - margin.right);
    const height = Math.max(100, outerHeight - margin.top - margin.bottom);

    const uid = `legend-${Math.random().toString(36).slice(2, 9)}`;
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${outerWidth} ${outerHeight}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', `${outerHeight}px`)
      .style('display', 'block');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Gradient for color legend
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id', `${uid}-grad`)
      .attr('x1', '0%').attr('x2', '100%').attr('y1', '0%').attr('y2', '0%');

    const stopCount = 12;
    for (let i = 0; i <= stopCount; i++) {
      grad.append('stop')
        .attr('offset', `${(i / stopCount) * 100}%`)
        .attr('stop-color', colorInterpolator(i / stopCount));
    }

    // Scales
    const xExtent = d3.extent(data, d => d.x);
    const x = d3.scaleLinear().domain([Math.min(0, xExtent[0]!), Math.max(0, xExtent[1]!)])
      .nice()
      .range([0, width]);

    const y = d3.scaleLinear().domain(d3.extent(data, d => d.y) as [number, number])
      .nice()
      .range([height, 0]);

    // Axes
    const xAxis = g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(Math.min(8, Math.floor(width / 80))).tickSize(-height));
    const yAxis = g.append('g')
      .call(d3.axisLeft(y).ticks(Math.min(8, Math.floor(height / 60))).tickSize(-width));

    xAxis.selectAll('.tick line').style('opacity', 0.12);
    yAxis.selectAll('.tick line').style('opacity', 0.12);

    xAxis.selectAll('text').style('font-size', '0.95rem').style('fill', 'var(--mantine-color-text)');
    yAxis.selectAll('text').style('font-size', '0.95rem').style('fill', 'var(--mantine-color-text)');

    g.append('text')
      .attr('transform', `translate(${width / 2},${height + 30})`)
      .style('text-anchor', 'middle')
      .style('fill', 'var(--mantine-color-text)')
      .style('font-size', '1rem')
      .text(xAxisTitle);

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left + 30)
      .attr('x', 0 - height / 2)
      .attr('dy', '1.2em')
      .style('text-anchor', 'middle')
      .style('fill', 'var(--mantine-color-text)')
      .style('font-size', '1rem')
      .text(yAxisTitle);

    // Clip
    svg.append('defs')
      .append('clipPath')
      .attr('id', `${uid}-clip`)
      .append('rect')
      .attr('x', 0).attr('y', 0)
      .attr('width', width).attr('height', height);

    // Zoom
    const zoom = d3.zoom()
      .filter(event => event.type === 'wheel' || event.type === 'mousedown')
      .scaleExtent([0.5, 20])
      .extent([[0, 0], [width, height]])
      .on('zoom', event => {
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

    const zoomRect = g.append('rect')
      .attr('width', width).attr('height', height)
      .style('fill', 'none')
      .style('pointer-events', 'all');

    zoomRect.call(zoom);

    const scatter = g.append('g').attr('clip-path', `url(#${uid}-clip)`);

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
        const [mx, my] = d3.pointer(event, g.node());
        setDetails({ xPos: mx, yPos: my, name: hoverProp[data.indexOf(d)] });
      })
      .on('mouseleave', function () {
        d3.select(this).transition().duration(150).attr('r', bubbleSize).attr('opacity', 0.95);
        setDetails(null);
      })
      .on('click', (_, d) => {
        setModalDets({
          activity: colorProperty[data.indexOf(d)],
          canonical_smiles: hoverProp[data.indexOf(d)],
          id: id[data.indexOf(d)]
        });
        open();
      });

    // Discrete color legend
    if (discreteColor && colorProperty.length) {
      const categories = Array.from(new Set(colorProperty)).sort((a, b) => a - b);
      const discreteScale = d3.scaleOrdinal<number, string>().domain(categories).range(d3.schemeTableau10);

      const legend = g.append("g").attr("transform", `translate(${width + 20},0)`);

      legend.selectAll("g")
        .data(categories)
        .join("g")
        .attr("transform", (_, i) => `translate(0,${i * 20})`)
        .each(function (d) {
          const row = d3.select(this);
          row.append("rect").attr("width", 14).attr("height", 14).attr("rx", 3).attr("fill", discreteScale(d));
          row.append("text").attr("x", 20).attr("y", 11).style("font-size", "0.85rem").style("fill", "var(--mantine-color-text)").text(`Fold ${d}`);
        });
    }

    // Color gradient legend
    // Legend
    if (colorProperty.length) {
      if (discreteColor) {
        // --- Discrete legend ---
        const categories = Array.from(new Set(colorProperty)).sort((a, b) => a - b);
        const discreteScale = d3.scaleOrdinal<number, string>().domain(categories).range(d3.schemeTableau10);

        // Place discrete legend below chart if width is small
        const legendX = 0;
        const legendY = height + 40; // below chart with margin

        const legend = g.append("g")
          .attr("transform", `translate(${legendX},${legendY})`);

        legend.selectAll("g")
          .data(categories)
          .join("g")
          .attr("transform", (_, i) => `translate(${i * 70}, 0)`) // horizontal layout
          .each(function (d) {
            const row = d3.select(this);
            row.append("rect")
              .attr("width", 14)
              .attr("height", 14)
              .attr("rx", 3)
              .attr("fill", discreteScale(d));

            row.append("text")
              .attr("x", 18)
              .attr("y", 11)
              .style("font-size", "0.85rem")
              .style("fill", "var(--mantine-color-text)")
              .text(`Fold ${d}`);
          });

      } else {
        // --- Continuous gradient legend ---
        const legendHeight = 8;
        const legendMarginTop = height + 48;

        g.append('rect')
          .attr('x', 0)
          .attr('y', legendMarginTop)
          .attr('width', width)
          .attr('height', legendHeight)
          .attr('rx', 3)
          .style('fill', `url(#${uid}-grad)`)
          .style('stroke', 'rgba(0,0,0,0.1)')
          .style('stroke-width', 0.6);

        const legendScale = d3.scaleLinear().domain(colorDomain).range([0, width]);

        g.append('g')
          .attr('transform', `translate(0,${legendMarginTop + legendHeight + 2})`)
          .call(d3.axisBottom(legendScale).ticks(6).tickSize(6).tickFormat(d3.format('.2~f')))
          .call(g => g.select('.domain').remove())
          .selectAll('text')
          .style('font-size', '0.85rem');
      }
    }


  }, [data, outerSize, selectedColorScale, bubbleSize, colorProperty, hoverProp, xAxisTitle, yAxisTitle, discreteColor, id, open]);

  function handleColorScaleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedColorScale(e.target.value);
  }

  return (
    <div ref={parentRef} className="w-full">
      <svg ref={svgRef} />
      <Screenshotter svgRef={svgRef} />
      <Modal opened={opened} onClose={close} size={"lg"}>
        <div className='ml-forms'>
          {modalDets && (
            <div className='ml-forms'>
              <span>Activity: {modalDets.activity.toFixed(2)}</span>
              &nbsp;
              <span>ID: {localStorage.getItem("dataSource") === "chembl" ?
                <a href={`https://www.ebi.ac.uk/chembl/compound_report_card/${modalDets.id}/`}>{modalDets.id}</a> : modalDets.id}</span>
              <MoleculeStructure height={500} width={500} structure={modalDets.canonical_smiles} key={randomInt(0, 1000000).toString()} id="smiles" />
            </div>
          )}
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
