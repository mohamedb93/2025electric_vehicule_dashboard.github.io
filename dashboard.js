// Load and process the data
d3.csv("electric_vehicles_spec_2025.csv").then(function(data) {
    // Convert numeric fields to numbers
    data.forEach(function(d) {
        d.range_km = +d.range_km;
        d.battery_capacity_kWh = +d.battery_capacity_kWh;
        d.efficiency_wh_per_km = +d.efficiency_wh_per_km;
        d.acceleration_0_100_s = +d.acceleration_0_100_s;
        d.top_speed_kmh = +d.top_speed_kmh;
        d.torque_nm = +d.torque_nm;
        d.fast_charging_power_kw_dc = +d.fast_charging_power_kw_dc;
        d.towing_capacity_kg = +d.towing_capacity_kg;
        d.cargo_volume_l = +d.cargo_volume_l;
        d.seats = +d.seats;
    });

    // Set up dimensions and margins
    const margin = {top: 40, right: 30, bottom: 60, left: 60};
    const width = 500 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Set up color scales
    const colorScale = d3.scaleOrdinal()
        .domain(["FWD", "RWD", "AWD"])
        .range(["#3498db", "#e74c3c", "#2ecc71"]);

    const segmentColor = d3.scaleOrdinal(d3.schemeTableau10);

    // Tooltip setup
    const tooltip = d3.select(".tooltip");

    // Populate filter dropdowns
    const brands = [...new Set(data.map(d => d.brand))].sort();
    const brandFilter = d3.select("#brand-filter");
    brands.forEach(brand => {
        brandFilter.append("option")
            .attr("value", brand)
            .text(brand);
    });

    const segments = [...new Set(data.map(d => d.segment))].sort();
    const segmentFilter = d3.select("#segment-filter");
    segments.forEach(segment => {
        segmentFilter.append("option")
            .attr("value", segment)
            .text(segment);
    });

    // Initial render
    updateCharts(data);

    // Filter event listeners
    d3.selectAll("select").on("change", function() {
        const filteredData = filterData(data);
        updateCharts(filteredData);
    });

    // Filter function
    function filterData(data) {
        const brand = d3.select("#brand-filter").property("value");
        const segment = d3.select("#segment-filter").property("value");
        const drivetrain = d3.select("#drivetrain-filter").property("value");

        return data.filter(d => {
            return (brand === "all" || d.brand === brand) &&
                   (segment === "all" || d.segment === segment) &&
                   (drivetrain === "all" || d.drivetrain === drivetrain);
        });
    }

    // Update all charts
    function updateCharts(filteredData) {
        drawScatterPlot(filteredData);
        drawBarChart(filteredData);
        drawPieChart(filteredData);
        drawBoxPlot(filteredData);
    }

    // 1. Scatter Plot: Range vs. Battery Capacity
    function drawScatterPlot(data) {
        // Clear previous chart
        d3.select("#scatter-plot").selectAll("*").remove();

        // Create SVG
        const svg = d3.select("#scatter-plot")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Set scales
        const x = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.battery_capacity_kWh) * 1.1])
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.range_km) * 1.1])
            .range([height, 0]);

        // Add axes
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .append("text")
            .attr("class", "axis-label")
            .attr("x", width / 2)
            .attr("y", 40)
            .attr("fill", "#000")
            .text("Battery Capacity (kWh)");

        svg.append("g")
            .call(d3.axisLeft(y))
            .append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("y", -40)
            .attr("x", -height / 2)
            .attr("fill", "#000")
            .text("Range (km)");

        // Add dots
        svg.selectAll(".dot")
            .data(data)
            .enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d.battery_capacity_kWh))
            .attr("cy", d => y(d.range_km))
            .attr("r", 5)
            .attr("fill", d => colorScale(d.drivetrain))
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", 1)
                    .html(`<strong>${d.brand} ${d.model}</strong><br>
                          Range: ${d.range_km} km<br>
                          Battery: ${d.battery_capacity_kWh} kWh<br>
                          Drivetrain: ${d.drivetrain}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                tooltip.style("opacity", 0);
            });

        // Add legend
        const legend = svg.append("g")
            .attr("transform", `translate(${width - 100}, 20)`);

        const drivetrains = ["FWD", "RWD", "AWD"];

        drivetrains.forEach((drivetrain, i) => {
            const legendRow = legend.append("g")
                .attr("transform", `translate(0, ${i * 20})`);

            legendRow.append("rect")
                .attr("width", 10)
                .attr("height", 10)
                .attr("fill", colorScale(drivetrain));

            legendRow.append("text")
                .attr("x", 15)
                .attr("y", 10)
                .attr("class", "legend")
                .text(drivetrain);
        });
    }

    // 2. Bar Chart: Average Efficiency by Brand (Top 15)
    function drawBarChart(data) {
        // Clear previous chart
        d3.select("#bar-chart").selectAll("*").remove();

        // Group data by brand and calculate average efficiency
        const brandEfficiency = d3.rollup(
            data,
            v => d3.mean(v, d => d.efficiency_wh_per_km),
            d => d.brand
        );

        // Convert to array and sort by efficiency
        let brandEfficiencyArray = Array.from(brandEfficiency, ([brand, efficiency]) => ({brand, efficiency}));
        brandEfficiencyArray.sort((a, b) => a.efficiency - b.efficiency);

        // Take top 15 brands with most models (for better visualization)
        const brandCounts = d3.rollup(data, v => v.length, d => d.brand);
        brandEfficiencyArray = Array.from(brandCounts, ([brand, count]) => ({brand, count}))
            .sort((a, b) => b.count - a.count)
            .slice(0, 15)
            .map(d => {
                const eff = brandEfficiency.get(d.brand);
                return {brand: d.brand, efficiency: eff};
            })
            .sort((a, b) => a.efficiency - b.efficiency);

        // Create SVG
        const svg = d3.select("#bar-chart")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Set scales
        const x = d3.scaleBand()
            .domain(brandEfficiencyArray.map(d => d.brand))
            .range([0, width])
            .padding(0.2);

        const y = d3.scaleLinear()
            .domain([0, d3.max(brandEfficiencyArray, d => d.efficiency) * 1.1])
            .range([height, 0]);

        // Add axes
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        svg.append("g")
            .call(d3.axisLeft(y))
            .append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("y", -40)
            .attr("x", -height / 2)
            .attr("fill", "#000")
            .text("Efficiency (Wh/km)");

        // Add bars
        svg.selectAll(".bar")
            .data(brandEfficiencyArray)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.brand))
            .attr("y", d => y(d.efficiency))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d.efficiency))
            .attr("fill", "#3498db")
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", 1)
                    .html(`<strong>${d.brand}</strong><br>
                          Avg Efficiency: ${d.efficiency.toFixed(1)} Wh/km`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                tooltip.style("opacity", 0);
            });

        // Add value labels
        svg.selectAll(".bar-label")
            .data(brandEfficiencyArray)
            .enter()
            .append("text")
            .attr("class", "bar-label")
            .attr("x", d => x(d.brand) + x.bandwidth() / 2)
            .attr("y", d => y(d.efficiency) - 5)
            .attr("text-anchor", "middle")
            .text(d => d.efficiency.toFixed(1));
    }

    // 3. Pie Chart: Drivetrain Distribution
    function drawPieChart(data) {
        // Clear previous chart
        d3.select("#pie-chart").selectAll("*").remove();

        // Group data by drivetrain
        const drivetrainData = d3.rollup(
            data,
            v => v.length,
            d => d.drivetrain
        );

        // Convert to array
        const drivetrainArray = Array.from(drivetrainData, ([drivetrain, count]) => ({drivetrain, count}));

        // Create SVG
        const radius = Math.min(width, height) / 2;
        const svg = d3.select("#pie-chart")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${width / 2 + margin.left},${height / 2 + margin.top})`);

        // Create pie layout
        const pie = d3.pie()
            .value(d => d.count)
            .sort(null);

        // Create arc generator
        const arc = d3.arc()
            .innerRadius(0)
            .outerRadius(radius);

        // Draw pie slices
        const arcs = svg.selectAll(".arc")
            .data(pie(drivetrainArray))
            .enter()
            .append("g")
            .attr("class", "arc");

        arcs.append("path")
            .attr("d", arc)
            .attr("fill", d => colorScale(d.data.drivetrain))
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", 1)
                    .html(`<strong>${d.data.drivetrain}</strong><br>
                          Models: ${d.data.count}<br>
                          ${(d.data.count / data.length * 100).toFixed(1)}%`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                tooltip.style("opacity", 0);
            });

        // Add labels
        arcs.append("text")
            .attr("transform", d => `translate(${arc.centroid(d)})`)
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .text(d => d.data.drivetrain)
            .style("font-size", "10px")
            .style("fill", "white");
    }

    // 4. Box Plot: Acceleration Performance by Segment
    function drawBoxPlot(data) {
        // Clear previous chart
        d3.select("#box-plot").selectAll("*").remove();

        // Group data by segment
        const segmentGroups = d3.group(data, d => d.segment);

        // Calculate summary statistics for each segment
        const segments = Array.from(segmentGroups, ([segment, values]) => {
            const accelValues = values.map(d => d.acceleration_0_100_s).filter(d => !isNaN(d));
            accelValues.sort(d3.ascending);

            const q1 = d3.quantile(accelValues, 0.25);
            const median = d3.quantile(accelValues, 0.5);
            const q3 = d3.quantile(accelValues, 0.75);
            const iqr = q3 - q1;
            const min = d3.min(accelValues);
            const max = d3.max(accelValues);

            return {
                segment,
                values: accelValues,
                q1,
                median,
                q3,
                iqr,
                min,
                max
            };
        });

        // Sort segments by median acceleration
        segments.sort((a, b) => a.median - b.median);

        // Create SVG
        const svg = d3.select("#box-plot")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Set scales
        const x = d3.scaleBand()
            .domain(segments.map(d => d.segment))
            .range([0, width])
            .padding(0.2);

        const y = d3.scaleLinear()
            .domain([0, d3.max(segments, d => d.max) * 1.1])
            .range([height, 0]);

        // Add axes
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        svg.append("g")
            .call(d3.axisLeft(y))
            .append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("y", -40)
            .attr("x", -height / 2)
            .attr("fill", "#000")
            .text("0-100 km/h Acceleration (seconds)");

        // Draw box plots
        segments.forEach((d, i) => {
            const segmentX = x(d.segment) + x.bandwidth() / 2;

            // Main box
            svg.append("rect")
                .attr("x", x(d.segment) + x.bandwidth() * 0.2)
                .attr("y", y(d.q3))
                .attr("width", x.bandwidth() * 0.6)
                .attr("height", y(d.q1) - y(d.q3))
                .attr("fill", segmentColor(i))
                .attr("stroke", "#333")
                .on("mouseover", function(event) {
                    tooltip.style("opacity", 1)
                        .html(`<strong>${d.segment}</strong><br>
                              Min: ${d.min.toFixed(1)}s<br>
                              Q1: ${d.q1.toFixed(1)}s<br>
                              Median: ${d.median.toFixed(1)}s<br>
                              Q3: ${d.q3.toFixed(1)}s<br>
                              Max: ${d.max.toFixed(1)}s<br>
                              Models: ${d.values.length}`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function() {
                    tooltip.style("opacity", 0);
                });

            // Median line
            svg.append("line")
                .attr("x1", x(d.segment) + x.bandwidth() * 0.2)
                .attr("x2", x(d.segment) + x.bandwidth() * 0.8)
                .attr("y1", y(d.median))
                .attr("y2", y(d.median))
                .attr("stroke", "#333")
                .attr("stroke-width", 2);

            // Whiskers
            svg.append("line")
                .attr("x1", segmentX)
                .attr("x2", segmentX)
                .attr("y1", y(d.min))
                .attr("y2", y(d.q3))
                .attr("stroke", "#333");

            svg.append("line")
                .attr("x1", segmentX)
                .attr("x2", segmentX)
                .attr("y1", y(d.q1))
                .attr("y2", y(d.max))
                .attr("stroke", "#333");

            // Whisker caps
            svg.append("line")
                .attr("x1", segmentX - x.bandwidth() * 0.2)
                .attr("x2", segmentX + x.bandwidth() * 0.2)
                .attr("y1", y(d.min))
                .attr("y2", y(d.min))
                .attr("stroke", "#333");

            svg.append("line")
                .attr("x1", segmentX - x.bandwidth() * 0.2)
                .attr("x2", segmentX + x.bandwidth() * 0.2)
                .attr("y1", y(d.max))
                .attr("y2", y(d.max))
                .attr("stroke", "#333");
        });
    }
}).catch(function(error) {
    console.error("Error loading the data:", error);
});
