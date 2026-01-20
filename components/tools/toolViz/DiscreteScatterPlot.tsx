import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import MoleculeStructure from '../toolComp/MoleculeStructure';
import { randomInt } from 'mathjs';
import Screenshotter from '../../utils/d3toPNG';
import { Modal, Button, Group, Text, Slider, Select } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';


interface ScatterplotProps {
  data: { x: number; y: number }[];
  colorLabels?: string[];
  hoverProp?: string[];
  xAxisTitle?: string;
  yAxisTitle?: string;
  id?: string[];
  onSelectIndices?: (indices: number[]) => void;
  discreteColor?: boolean;    
}

interface Details {
  xPos: number;
  yPos: number;
  name: string;
}

interface ModalDets {
  activity: string;
  canonical_smiles: string;
  id: string;
}

interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
  label: string;
}

// Linear regression helper
function calculateLinearRegression(points: { x: number; y: number }[]): RegressionResult | null {
  if (points.length < 2) return null;

  const n = points.length;
  let sum_x = 0, sum_y = 0, sum_xy = 0, sum_xx = 0, sum_yy = 0;

  for (const p of points) {
    sum_x += p.x;
    sum_y += p.y;
    sum_xy += p.x * p.y;
    sum_xx += p.x * p.x;
    sum_yy += p.y * p.y;
  }

  const slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x);
  const intercept = (sum_y - slope * sum_x) / n;
  const r2 = Math.pow((n * sum_xy - sum_x * sum_y) / Math.sqrt((n * sum_xx - sum_x * sum_x) * (n * sum_yy - sum_y * sum_y)), 2);

  return { slope, intercept, r2, label: '' };
}

export default function DiscreteScatterplot({
  data,
  colorLabels = [],
  hoverProp = [],
  xAxisTitle = '',
  yAxisTitle = '',
  id = [],
  onSelectIndices
}: ScatterplotProps) {
  const margin = { top: 10, right: 100, bottom: 80, left: 80 };
  const parentRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [details, setDetails] = useState<Details | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [modalDets, setModalDets] = useState<ModalDets | null>(null);

  const [bubbleSize, setBubbleSize] = useState(6);
  const [selectedColorScale, setSelectedColorScale] = useState('Set1');
  const [showFitLines, setShowFitLines] = useState(true);
  
  // State for selectable color labels
  const [visibleLabels, setVisibleLabels] = useState<Set<string>>(() => {
    const unique = [...new Set(colorLabels)];
    return new Set(unique.length > 0 ? [unique[0]] : []);
  });

  const discreteColorScales: Record<string, string[]> = {
    Set1: d3.schemeSet1,
    Set2: d3.schemeSet2,
    Set3: d3.schemeSet3,
    Accent: d3.schemeAccent,
    Dark2: d3.schemeDark2,
    Paired: d3.schemePaired,
    Pastel1: d3.schemePastel1,
    Pastel2: d3.schemePastel2,
    Category10: d3.schemeCategory10
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

  // Toggle visibility of a label
  const toggleLabel = (label: string) => {
    setVisibleLabels(prev => {
      const updated = new Set(prev);
      if (updated.has(label)) {
        updated.delete(label);
      } else {
        updated.add(label);
      }
      return updated;
    });
  };

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const outerWidth = outerSize.width;
    const outerHeight = outerSize.height;
    const width = Math.max(100, outerWidth - margin.left - margin.right);
    const height = Math.max(100, outerHeight - margin.top - margin.bottom);

    const uid = `scatter-${Math.random().toString(36).slice(2, 9)}`;
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${outerWidth} ${outerHeight}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', `${outerHeight}px`)
      .style('display', 'block');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Get unique labels
    const uniqueLabels = [...new Set(colorLabels)];
    const colorScheme = discreteColorScales[selectedColorScale] || d3.schemeSet1;
    const colorScale = d3.scaleOrdinal<string>()
      .domain(uniqueLabels)
      .range(colorScheme);

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
      .filter((event) => {
        if (event.type === 'wheel') return true;
        if (event.type === 'mousedown') return event.button === 0;
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

        fitLines.selectAll('line')
          .attr('x1', (d: any) => newX(d.x1))
          .attr('y1', (d: any) => newY(d.y1))
          .attr('x2', (d: any) => newX(d.x2))
          .attr('y2', (d: any) => newY(d.y2));

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
    const fitLines = g.append('g').attr('clip-path', `url(#${uid}-clip)`);
    const r2Labels = g.append('g');

    // Plot circles - only show if label is visible
    scatter.selectAll('circle')
      .data(data)
      .join('circle')
      .attr('cx', d => x(d.x))
      .attr('cy', d => y(d.y))
      .attr('r', bubbleSize)
      .attr('fill', (_, i) => colorLabels.length ? colorScale(colorLabels[i]) : '#6b7280')
      .attr('stroke', 'white')
      .attr('stroke-width', 0.7)
      .attr('opacity', 0.85)
      .style('display', (_, i) => visibleLabels.has(colorLabels[i]) ? 'block' : 'none')
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).raise().transition().duration(150).attr('r', bubbleSize * 1.8).attr('opacity', 1);
        const [mx, my] = d3.pointer(event, g.node());
        const idx = data.indexOf(d);
        setDetails({ xPos: mx, yPos: my, name: hoverProp[idx] || '' });
      })
      .on('mouseleave', function () {
        d3.select(this).transition().duration(150).attr('r', bubbleSize).attr('opacity', 0.85);
        setDetails(null);
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        const idx = data.indexOf(d);
        setModalDets({
          activity: colorLabels.length ? colorLabels[idx] : '—',
          canonical_smiles: hoverProp[idx] || '',
          id: id[idx] || ''
        });
        open();
      });

    // Draw fit lines per category
    if (showFitLines && colorLabels.length) {
      const xDomain = x.domain();
      const lineData: any[] = [];

      uniqueLabels.forEach((label, labelIdx) => {
        const groupPoints = data.filter((_, i) => colorLabels[i] === label);
        const regression = calculateLinearRegression(groupPoints);

        if (regression) {
          const x1 = xDomain[0];
          const x2 = xDomain[1];
          const y1 = regression.slope * x1 + regression.intercept;
          const y2 = regression.slope * x2 + regression.intercept;

          lineData.push({
            x1, y1, x2, y2,
            color: colorScale(label),
            label,
            r2: regression.r2,
            visible: visibleLabels.has(label)
          });
        }
      });

      fitLines.selectAll('line')
        .data(lineData)
        .join('line')
        .attr('x1', d => x(d.x1))
        .attr('y1', d => y(d.y1))
        .attr('x2', d => x(d.x2))
        .attr('y2', d => y(d.y2))
        .attr('stroke', d => d.color)
        .attr('stroke-width', 2)
        .attr('opacity', d => d.visible ? 0.6 : 0.15)
        .attr('stroke-dasharray', '5,5')
        .style('pointer-events', 'none');

      // Add R² labels on the TOP RIGHT
      r2Labels.selectAll('g.r2-label-group')
        .data(lineData)
        .join('g')
        .attr('class', 'r2-label-group')
        .attr('transform', (d, i) => {
          return `translate(${width - 95}, ${i * 25 + 10})`;
        })
        .style('opacity', d => d.visible ? 1 : 0.3)
        .call(g => {
          g.selectAll('rect').remove();
          g.append('rect')
            .attr('x', -3)
            .attr('y', -10)
            .attr('width', 90)
            .attr('height', 20)
            .attr('rx', 3)
            .attr('fill', d => d.color)
            .attr('opacity', 0.12)
            .attr('stroke', d => d.color)
            .attr('stroke-width', 1)
            .attr('stroke-opacity', 0.4);

          g.selectAll('text').remove();
          g.append('text')
            .attr('fill', d => d.color)
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .attr('text-anchor', 'start')
            .attr('dominant-baseline', 'middle')
            .attr('x', 4)
            .attr('y', 0)
            .text(d => `${d.label}: R² = ${d.r2.toFixed(3)}`)
            .style('pointer-events', 'none');
        });
    }

    // Legend (bottom, clickable)
    if (colorLabels.length && uniqueLabels.length > 0) {
      const legendY = height + 48;
      const legendItemSpacing = 80;

      g.selectAll('g.legend-item')
        .data(uniqueLabels)
        .join('g')
        .attr('class', 'legend-item')
        .attr('transform', (_, i) => `translate(${i * legendItemSpacing}, ${legendY})`)
        .style('cursor', 'pointer')
        .on('click', (event, label) => {
          event.stopPropagation();
          toggleLabel(label);
        })
        .call(g => {
          g.selectAll('rect').remove();
          g.append('rect')
            .attr('width', 12)
            .attr('height', 12)
            .attr('fill', d => colorScale(d))
            .attr('rx', 2)
            .attr('stroke', d => visibleLabels.has(d) ? colorScale(d) : 'rgba(128,128,128,0.3)')
            .attr('stroke-width', d => visibleLabels.has(d) ? 2 : 1)
            .attr('opacity', d => visibleLabels.has(d) ? 1 : 0.3);

          g.selectAll('text').remove();
          g.append('text')
            .attr('x', 18)
            .attr('y', 10)
            .style('font-size', '0.9rem')
            .style('fill', d => visibleLabels.has(d) ? 'var(--mantine-color-text)' : 'rgba(128,128,128,0.5)')
            .text(d => d);
        });
    }
  }, [data, outerSize, selectedColorScale, bubbleSize, colorLabels, hoverProp, xAxisTitle, yAxisTitle, id, open, showFitLines, visibleLabels]);

  function handleColorScaleChange(value: string) {
    setSelectedColorScale(value);
  }

  return (
    <div ref={parentRef} className="w-full">
      <svg ref={svgRef} />
      <Screenshotter svgRef={svgRef} />

      <Group justify="apart" mt="xs" mb="xs">
        <Text size="xs" c="dimmed" ta="left">
          🖱️ Wheel/Drag to zoom | Click legend to show/hide
        </Text>
      </Group>

      <details>
        <summary>Plot Settings</summary>
        <div className='ml-forms' style={{ padding: '1rem 0' }}>
          {colorLabels.length > 0 && (
            <>
              <Text size="sm" mb="xs" fw={500}>Discrete Color Scheme:</Text>
              <Select
                size="xs"
                data={Object.keys(discreteColorScales)}
                value={selectedColorScale}
                onChange={(val) => handleColorScaleChange(val || 'Set1')}
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
          <Text size="xs" c="dimmed" mb="md">{bubbleSize.toFixed(0)}px</Text>

          {colorLabels.length > 0 && (
            <>
              <Text size="sm" mb="xs" fw={500}>Show Fit Lines:</Text>
              <Button
                size="xs"
                variant={showFitLines ? 'filled' : 'light'}
                onClick={() => setShowFitLines(!showFitLines)}
              >
                {showFitLines ? '✓ Enabled' : 'Disabled'}
              </Button>
            </>
          )}
        </div>
      </details>

      <Modal opened={opened} onClose={close} size="lg" title="Details">
        {modalDets && (
          <div className='ml-forms'>
            <Text mb="sm">
              <Text span fw={500}>Label:</Text> {modalDets.activity}
            </Text>
            <Text mb="lg">
              <Text span fw={500}>ID:</Text> {modalDets.id}
            </Text>
            {modalDets.canonical_smiles && (
              <MoleculeStructure 
                height={500} 
                width={500} 
                structure={modalDets.canonical_smiles} 
                key={randomInt(0, 1000000).toString()} 
                id="smiles" 
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}