"use client"

import { useEffect, useRef } from "react"
import * as d3 from "d3"

type Props = {
  data: number[]
  metricName: string
  color?: string
}

export default function FoldMetricBarplot({
  data,
  metricName,
  color = "#6366f1" // indigo-ish
}: Props) {
  const ref = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (!ref.current || !data?.length) return

    const drawChart = () => {
      if (!ref.current) return

      const svg = d3.select(ref.current)
      svg.selectAll("*").remove()

      // --------------------
      // Dimensions
      // --------------------
      const containerWidth = ref.current.clientWidth
      const width = containerWidth
      const height = containerWidth * 0.6 // maintain aspect ratio
      const margin = { top: 40, right: 20, bottom: 50, left: 60 }
      const innerWidth = width - margin.left - margin.right
      const innerHeight = height - margin.top - margin.bottom

      const g = svg
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)

      // --------------------
      // Scales
      // --------------------
      const x = d3.scaleBand()
        .domain(data.map((_, i) => `Fold ${i + 1}`))
        .range([0, innerWidth])
        .padding(0.25)

      const y = d3.scaleLinear()
        .domain([
          Math.min(0, d3.min(data) ?? 0),
          d3.max(data) ?? 1
        ])
        .nice()
        .range([innerHeight, 0])

      // --------------------
      // Axes
      // --------------------
      g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("font-size", "11px")

      g.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "11px")

      // --------------------
      // Bars
      // --------------------
      g.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", (_, i) => x(`Fold ${i + 1}`)!)
        .attr("width", x.bandwidth())
        .attr("y", innerHeight)
        .attr("height", 0)
        .attr("rx", 6)
        .attr("fill", color)
        .attr("y", d => y(d))
        .attr("height", d => innerHeight - y(d))

      // --------------------
      // Value labels
      // --------------------
      g.selectAll(".label")
        .data(data)
        .enter()
        .append("text")
        .attr("x", (_, i) => x(`Fold ${i + 1}`)! + x.bandwidth() / 2)
        .attr("y", d => y(d) - 6)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .style("fill", "var(--mantine-color-text)")
        .text(d => d.toFixed(3))

      // --------------------
      // Title
      // --------------------
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", 22)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", 600)
        .style("fill", "var(--mantine-color-text)")
        .text(`${metricName} Across CV Folds`)
    }

    drawChart()

    // --------------------
    // Responsive: redraw on resize
    // --------------------
    const resizeObserver = new ResizeObserver(() => drawChart())
    if (ref.current) resizeObserver.observe(ref.current)

    return () => resizeObserver.disconnect()

  }, [data, metricName, color])

  return (
    <svg ref={ref} style={{ display: "block", margin: "0 auto", width: "100%" }} />
  )
}
