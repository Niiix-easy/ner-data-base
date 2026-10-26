"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface HourlyData {
  hour: string;
  count: number;
}

interface HourlyHeatmapProps {
  apiKeyId: number;
}

export function HourlyHeatmap({ apiKeyId }: HourlyHeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<HourlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/control-plane/api-keys/${apiKeyId}/hourly-stats`);
        if (res.ok) {
          const stats = await res.json();
          setData(stats);
        }
      } catch (err) {
        console.error("Failed to fetch hourly stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [apiKeyId]);

  useEffect(() => {
    if (loading || data.length === 0 || !svgRef.current) return;

    const margin = { top: 30, right: 30, bottom: 40, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Days of the week
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    // Hours of the day
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // X scale (Hours)
    const x = d3.scaleBand()
      .range([0, width])
      .domain(hours.map(String))
      .padding(0.05);

    svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x).tickFormat(d => `${d}h`))
      .selectAll("text")
      .style("font-size", "10px")
      .style("fill", "#666");

    // Y scale (Days)
    // We need to map the actual dates in the last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' }));
    }

    const y = d3.scaleBand()
      .range([height, 0])
      .domain(last7Days)
      .padding(0.05);

    svg.append("g")
      .call(d3.axisLeft(y))
      .selectAll("text")
      .style("font-size", "10px")
      .style("fill", "#666");

    // Color scale
    const color = d3.scaleSequential()
      .interpolator(d3.interpolateGreens)
      .domain([0, d3.max(data, d => d.count) || 10]);

    // Process data to map to grids
    const heatmapData = data.map(d => {
      const date = new Date(d.hour);
      const dayLabel = date.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
      return {
        day: dayLabel,
        hour: String(date.getHours()),
        count: d.count
      };
    });

    // Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "absolute hidden bg-black/90 border border-white/10 p-2 rounded text-[10px] text-white z-[300]");

    svg.selectAll()
      .data(heatmapData)
      .enter()
      .append("rect")
      .attr("x", d => x(d.hour) || 0)
      .attr("y", d => y(d.day) || 0)
      .attr("rx", 2)
      .attr("ry", 2)
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", d => d.count === 0 ? "rgba(255,255,255,0.03)" : color(d.count))
      .on("mouseover", (event, d) => {
        tooltip.style("display", "block")
          .html(`${d.day} at ${d.hour}:00<br/><b>${d.count} requests</b>`);
      })
      .on("mousemove", (event) => {
        tooltip.style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 15) + "px");
      })
      .on("mouseleave", () => {
        tooltip.style("display", "none");
      });

    // Cleanup tooltip on unmount
    return () => {
      tooltip.remove();
    };

  }, [data, loading]);

  if (loading) return <div className="h-48 bg-white/5 animate-pulse rounded-2xl" />;

  return (
    <div className="overflow-x-auto py-4">
      <div className="min-w-[800px]">
        <svg ref={svgRef}></svg>
      </div>
    </div>
  );
}
