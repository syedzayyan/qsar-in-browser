import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import MoleculeStructure from '../toolComp/MoleculeStructure';
import { randomInt } from 'mathjs';
import Screenshotter from '../../utils/d3toPNG';
import { Modal, Button, Group, Text, Slider, Select } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

interface ScatterplotProps {
  data: { x: number; y: number }[];
  colorProperty?: number[];
  hoverProp?: string[];
  xAxisTitle?: string;
  yAxisTitle?: string;
  id?: string[];
  discreteColor?: boolean;
  onSelectIndices?: (indices: number[]) => void;
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
  discreteColor = false,
  onSelectIndices
}: ScatterplotProps) {
  const margin = { top: 10, right: 20, bottom: 80, left: 80 };
  const parentRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [details, setDetails] = useState<Details | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [modalDets, setModalDets] = useState<ModalDets | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const [mode, setMode] = useState<'zoom' | 'select'>('zoom');

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

  // Clean up selection rects when mode changes
  useEffect(() => {
    if (svgRef.current) {
      d3.select(svgRef.current).selectAll('.selection-rect').remove();
    }
  }, [mode]);

  const colorDomain = colorProperty.length ? [d3.min(colorProperty)!, d3.max(colorProperty)!] : [0, 1];
  const colorInterpolator = colorScales[selectedColorScale] || d3.interpolateViridis;
  const colorScaler = d3.scaleSequential(colorInterpolator).domain(colorDomain);

  // Selection handlers
  const createSelectionHandlers = useCallback((g: d3.Selection<SVGGElement, unknown, null, undefined>,
    scatter: d3.Selection<SVGGElement, unknown, null, undefined>,
    width: number, height: number) => {
    let selectionStart: [number, number] | null = null;
    let selectionRect: d3.Selection<SVGRectElement, unknown, null, undefined> | null = null;
    let isSelecting = false;

    const cleanup = () => {
      g.selectAll('.selection-rect').remove();
      isSelecting = false;
      selectionStart = null;
      selectionRect = null;
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (mode !== 'select' || event.button !== 2 || !onSelectIndices) return;

      event.preventDefault();
      event.stopPropagation();

      cleanup();

      isSelecting = true;
      const [sx, sy] = d3.pointer(event, g.node());
      selectionStart = [sx, sy];

      selectionRect = g.append('rect')
        .attr('class', 'selection-rect')
        .attr('x', sx)
        .attr('y', sy)
        .attr('width', 0)
        .attr('height', 0)
        .attr('fill', 'rgba(100, 150, 255, 0.12)')
        .attr('stroke', 'rgb(100, 150, 255)')
        .attr('stroke-width', 1.2)
        .attr('stroke-dasharray', '4,4')
        .style('pointer-events', 'none');
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isSelecting || !selectionStart || !selectionRect || !onSelectIndices) return;

      const [cx, cy] = d3.pointer(event, g.node());
      const [sx, sy] = selectionStart;

      const x0 = Math.min(sx, cx);
      const y0 = Math.min(sy, cy);
      const wSel = Math.abs(cx - sx);
      const hSel = Math.abs(cy - sy);

      selectionRect
        .attr('x', x0)
        .attr('y', y0)
        .attr('width', wSel)
        .attr('height', hSel);
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (!isSelecting || !selectionStart || !selectionRect || !onSelectIndices) return;

      const [ex, ey] = d3.pointer(event, g.node());
      const [sx, sy] = selectionStart;

      const x0 = Math.min(sx, ex);
      const x1 = Math.max(sx, ex);
      const y0 = Math.min(sy, ey);
      const y1 = Math.max(sy, ey);

      const selected: number[] = [];
      scatter.selectAll<SVGCircleElement, { x: number; y: number }>('circle')
        .each(function (_, i) {
          const cx = +d3.select(this).attr('cx');
          const cy = +d3.select(this).attr('cy');
          if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) {
            selected.push(i);
          }
        });

      console.log('Selected indices:', selected);
      setSelectedIndices(selected);
      if (onSelectIndices) onSelectIndices(selected);

      cleanup();
    };

    const handleMouseLeave = () => {
      isSelecting = false;
      selectionStart = null;
    };

    return { handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave };
  }, [mode, onSelectIndices]);

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

    // LEFT CLICK DRAG = Pan/Zoom ONLY in zoom mode
    const zoom = d3.zoom()
      .filter((event) => {
        if (mode !== 'zoom') return false;
        if (event.type === 'wheel') return true;
        if (event.type === 'mousedown') {
          return event.button === 0;
        }
        return false;
      })
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

    g.call(zoom);

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
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).raise().transition().duration(150).attr('r', bubbleSize * 1.8).attr('opacity', 1);
        const [mx, my] = d3.pointer(event, g.node());
        setDetails({ xPos: mx, yPos: my, name: hoverProp[data.indexOf(d)] });
      })
      .on('mouseleave', function () {
        d3.select(this).transition().duration(150).attr('r', bubbleSize).attr('opacity', 0.95);
        setDetails(null);
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        setModalDets({
          activity: colorProperty[data.indexOf(d)],
          canonical_smiles: hoverProp[data.indexOf(d)],
          id: id[data.indexOf(d)]
        });
        open();
      });

    // RIGHT CLICK DRAG = Selection window ONLY in select mode
    const { handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave } =
      createSelectionHandlers(g, scatter, width, height);

    // Remove any existing selection overlay first
    g.selectAll('.selection-overlay').remove();

    // Create a separate overlay rect for selection (on top, not affected by zoom)
    const selectionOverlay = g.append('rect')
      .attr('class', 'selection-overlay')
      .attr('width', width)
      .attr('height', height)
      .style('fill', 'none')
      .style('pointer-events', mode === 'select' ? 'all' : 'none')
      .style('cursor', mode === 'select' ? 'crosshair' : 'default');

    const overlayNode = selectionOverlay.node() as SVGRectElement;
    if (overlayNode) {
      overlayNode.addEventListener('mousedown', handleMouseDown);
      overlayNode.addEventListener('mousemove', handleMouseMove);
      overlayNode.addEventListener('mouseup', handleMouseUp);
      overlayNode.addEventListener('mouseleave', handleMouseLeave);
    }

    // Prevent browser context menu
    svg.on('contextmenu', (event) => {
      if (onSelectIndices && mode === 'select') {
        event.preventDefault();
      }
    });

    // Legends code (discrete and continuous) - unchanged from previous version
    // [Insert the discrete color legend and color gradient legend code here - same as before]

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
    if (colorProperty.length) {
      if (discreteColor) {
        const categories = Array.from(new Set(colorProperty)).sort((a, b) => a - b);
        const discreteScale = d3.scaleOrdinal<number, string>().domain(categories).range(d3.schemeTableau10);

        const legendX = 0;
        const legendY = height + 40;

        const legend = g.append("g")
          .attr("transform", `translate(${legendX},${legendY})`);

        legend.selectAll("g")
          .data(categories)
          .join("g")
          .attr("transform", (_, i) => `translate(${i * 70}, 0)`)
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
  }, [data, outerSize, selectedColorScale, bubbleSize, colorProperty, hoverProp, xAxisTitle, yAxisTitle, discreteColor, id, open, onSelectIndices, mode, createSelectionHandlers]);

  function handleColorScaleChange(value: string) {
    setSelectedColorScale(value);
  }

  function clearSelection() {
    setSelectedIndices([]);
    if (svgRef.current) {
      d3.select(svgRef.current).selectAll('.selection-rect').remove();
    }
  }

  const modeInstruction = mode === 'zoom'
    ? '🖱️ Click bubbles to open modal, wheel/drag to zoom'
    : '📦 Right-drag to select bubbles, click to open modal';

  return (
    <div ref={parentRef} className="w-full">
      <svg ref={svgRef} />
      <Screenshotter svgRef={svgRef} />

      <Group justify="apart" mt="xs" mb="xs">
        <Group>
          <Button
            size="xs"
            variant={mode === 'zoom' ? 'filled' : 'light'}
            onClick={() => setMode('zoom')}
            leftSection="🔍"
          >
            Zoom Mode
          </Button>
          <Button
            size="xs"
            variant={mode === 'select' ? 'filled' : 'light'}
            onClick={() => setMode('select')}
            leftSection="📦"
          >
            Selection Mode
          </Button>
        </Group>
        <Text size="xs" c="dimmed" ta="right">
          {modeInstruction}
        </Text>
      </Group>

      {selectedIndices.length > 0 && (
        <Group justify="apart" mb="md">
          <Text fw={600} c="blue">
            Selected: {selectedIndices.length} bubble(s)
          </Text>
          <Button size="xs" variant="subtle" onClick={clearSelection} color="red">
            Clear Selection
          </Button>
        </Group>
      )}

      <Modal opened={opened} onClose={close} size="lg" title="Molecule Details">
        <div className='ml-forms'>
          {modalDets && (
            <div className='ml-forms'>
              <Text mb="sm">
                <Text span fw={500}>Activity:</Text> {modalDets.activity.toFixed(2)}
              </Text>
              <Text mb="lg">
                <Text span fw={500}>ID:</Text> {localStorage.getItem("dataSource") === "chembl" ?
                  <a href={`https://www.ebi.ac.uk/chembl/compound_report_card/${modalDets.id}/`} target="_blank">
                    {modalDets.id}
                  </a> : modalDets.id}
              </Text>
              <MoleculeStructure height={500} width={500} structure={modalDets.canonical_smiles} key={randomInt(0, 1000000).toString()} id="smiles" />
            </div>
          )}
        </div>
      </Modal>

      <details>
        <summary>Plot Settings</summary>
        <div className='ml-forms' style={{ padding: '1rem 0' }}>
          {colorProperty.length > 0 && (
            <>
              <Text size="sm" mb="xs" fw={500}>Color Scale:</Text>
              <Select
                size="xs"
                data={Object.keys(colorScales)}
                value={selectedColorScale}
                onChange={handleColorScaleChange}
                mb="md"
              />
            </>
          )}
          <Text size="sm" mb="xs" fw={500}>Bubble Size:</Text>
          <Slider
            size="xs"
            min={1}
            max={16}
            value={bubbleSize}
            onChange={setBubbleSize}
            mb="xs"
          />
          <Text size="xs" c="dimmed">{bubbleSize.toFixed(0)}px</Text>
        </div>
      </details>
    </div>
  );
}
