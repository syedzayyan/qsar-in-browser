import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as d3scale from 'd3-scale-chromatic';

const D3ColorLegend = () => {
    const chartRef = useRef();

    useEffect(() => {
        var colorScale = d3.scaleSequential(d3.interpolateSinebow)
            .domain([0, 10]);

        continuous(chartRef, colorScale);

        function continuous(selector_id, colorscale) {
            var legendheight = 50, // Reduce the height for a horizontal legend
                legendwidth = 500, // Increase the width for a horizontal legend
                margin = { top: 10, right: 2, bottom: 20, left: 60 }; // Adjust margins for a horizontal legend

            var canvas = d3.select(selector_id.current)
                .style("height", legendheight + "px")
                .style("width", legendwidth + "px")
                .style("position", "relative")
                .append("canvas")
                .attr("height", 1) // Set height to 1 for a horizontal legend
                .attr("width", legendwidth - margin.left - margin.right) // Adjust width based on legendwidth and margins
                .style("height", (legendheight - margin.top - margin.bottom) + "px")
                .style("width", (legendwidth - margin.left - margin.right) + "px")
                .style("border", "1px solid #000")
                .style("position", "absolute")
                .style("top", (margin.top) + "px")
                .style("left", (margin.left) + "px")
                .node();

            var ctx = canvas.getContext("2d");

            var legendscale = d3.scaleLinear()
                .range([0, legendwidth - margin.left - margin.right]) // Adjust the range for a horizontal legend
                .domain(colorscale.domain());

            // image data hackery based on http://bl.ocks.org/mbostock/048d21cf747371b11884f75ad896e5a5
            var image = ctx.createImageData(legendwidth - margin.left - margin.right, 1); // Create a horizontal image
            d3.range(legendwidth - margin.left - margin.right).forEach(function (i) {
                var c = d3.rgb(colorscale(legendscale.invert(i)));
                image.data[4 * i] = c.r;
                image.data[4 * i + 1] = c.g;
                image.data[4 * i + 2] = c.b;
                image.data[4 * i + 3] = 255;
            });
            ctx.putImageData(image, 0, 0);

            var legendaxis = d3.axisBottom() // Use axisBottom for a horizontal legend
                .scale(legendscale)
                .tickSize(6)
                .ticks(8);

            var svg = d3.select(selector_id.current)
                .append("svg")
                .attr("height", (legendheight) + "px")
                .attr("width", (legendwidth) + "px")
                .style("position", "absolute")
                .style("left", "0px")
                .style("top", "0px")

            svg
                .append("g")
                .attr("class", "axis")
                .attr("transform", "translate(" + (margin.left) + "," + (legendheight - margin.bottom) + ")") // Adjust transform for a horizontal legend
                .call(legendaxis);
        };
        
    }, []); // Empty dependency array to ensure useEffect runs only once

    return <div ref={chartRef} id="color-legend"></div>;
};

export default D3ColorLegend;
