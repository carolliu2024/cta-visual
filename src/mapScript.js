// mapScript.js

// Define the size of the map
const width = 1000;
const height = 800;

// Create an SVG container
const svg = d3.select('body').append('svg')
    .attr('width', width)
    .attr('height', height);

// Define a projection (you can experiment with different projections)
const projection = d3.geoMercator()
    .center([-87.6298, 41.8781]) // Adjusted center for the Chicagoland region
    .scale(60000) // Zoom in on Chicagoland region
    .translate([width / 2, height / 2]);

// Create a path generator
const path = d3.geoPath().projection(projection);

d3.json('illinois-counties.geojson').then(illinois => {
    // Draw the map with debugging styles
    svg.selectAll('path')
        .data(illinois.features)
        .enter().append('path')
        .attr('d', path)
        .style('fill', 'none') // Set fill to none for debugging
        .style('stroke', 'red'); // Set a red stroke color for debugging
});

// Load your CSV data with ridership information
d3.csv('ridership_with_locs-2.csv').then(data => {
    // Aggregate data by station
    const aggregatedData = d3.nest()
        .key(d => d.station_id)
        .rollup(group => ({
            totalRidership: d3.sum(group, d => +d.avg_weekday_rides),
            latitude: +group[0].latitude,
            longitude: +group[0].longitude
        }))
        .entries(data);

    // Scale for circle size based on total ridership
    const sizeScale = d3.scaleSqrt()
        .domain([0, d3.max(aggregatedData, d => d.value.totalRidership)])
        .range([2, 20]); // Adjust the range for desired circle sizes

    // Color scale for fill color based on total ridership
    const colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, d3.max(aggregatedData, d => d.value.totalRidership)]);

    // Map the aggregated data to the stations on the map
    svg.selectAll('circle')
        .data(aggregatedData)
        .enter().append('circle')
        .attr('cx', d => projection([d.value.longitude, d.value.latitude])[0])
        .attr('cy', d => projection([d.value.longitude, d.value.latitude])[1])
        .attr('r', d => sizeScale(d.value.totalRidership))
        .style('fill', d => colorScale(d.value.totalRidership))
        .style('opacity', 0.7) // Adjust the circle opacity
        .style('stroke', 'black') // Set a black stroke color for debugging
        .style('stroke-width', 1); // Set a stroke width for debugging
});

