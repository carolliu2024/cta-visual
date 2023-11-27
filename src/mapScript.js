// mapScript.js

// Define the size of the map
const width = 1000;
const height = 800;
var proj_scale = 60000;
var projX = width/2;
var projY = height/2;

// Create an SVG container
const svg = d3.select('body').append('svg')
    .attr('width', width)
    .attr('height', height);

// Define a projection (you can experiment with different projections)
const projection = d3.geoMercator()
    .center([-87.6298, 41.8781]) // Adjusted center for the Chicagoland region
    .scale(proj_scale) // Zoom in on Chicagoland region
    .translate([projX, projY]);

// Set up the tile generator
var tile = d3.tile()
  .size([width, height])
  .scale(projection.scale()* 2 * Math.PI) // * 2 * Math.PI
  .translate(projection([0, 0]))

// Generate tiles
var tiles = tile();

// Assuming you have a function 'url' for generating tile URLs
function url(x, y, z) {
  // Return tile URL
  // return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  return `https://tiles.stadiamaps.com/tiles/stamen_toner_lite/${z}/${x}/${y}.png`
}

// IMPLEMENT ZOOMING/DRAGGING
function zoomIn() {
  // handle scaling, translating
  const newTransform = d3.event.transform;
  // Update the map tiles and circles based on the new projection

  svg.selectAll('circle')
    .attr('cx', d => {
      // Calculate the new x position relative to the original position
      const originalX = projection([d.value.longitude, d.value.latitude])[0];
      return originalX + d3.event.transform.x;
    })
    .attr('cy', d => {
      // Calculate the new y position relative to the original position
      const originalY = projection([d.value.longitude, d.value.latitude])[1];
      return originalY + d3.event.transform.y;
    });

  // scale/translate current projection
  projection
    .center([-87.6298, 41.8781]) // Adjusted center for the Chicagoland region
    .scale(proj_scale*newTransform.k) // Zoom in on Chicagoland region
    .translate([projX, projY]);
    // .scale(newTransform.k * (60000 / 2 / Math.PI))
    // .translate([newTransform.x, newTransform.y]);

  // Update the map tiles and circles based on the new projection
  updateMap();
}

const zoom = d3.zoom()
  .scaleExtent([1, 10]) // min/max zoom levels
  .extent([[0, 0], [width, height]])
  .on("zoom", zoomIn);

// Apply zoom behavior to SVG container
svg.call(zoom);

// Function to update map tiles and circles
function updateMap() {
    tiles = tile(); // Regenerate tiles based on the updated projection
    // Update map tiles
    svg.selectAll('image')
    .data(tiles)
    .join(
        enter => enter.append('image')
        .attr('xlink:href', d => url(d[0], d[1], d[2]))
        .attr('x', d => Math.round((d[0] + tiles.translate[0]) * tiles.scale))
        .attr('y', d => Math.round((d[1] + tiles.translate[1]) * tiles.scale))
        .attr('width', tiles.scale)
        .attr('height', tiles.scale),
        update => update
        .attr('xlink:href', d => url(d[0], d[1], d[2]))
        .attr('x', d => Math.round((d[0] + tiles.translate[0]) * tiles.scale))
        .attr('y', d => Math.round((d[1] + tiles.translate[1]) * tiles.scale))
        .attr('width', tiles.scale)
        .attr('height', tiles.scale),
        exit => exit.remove()
    );
  
    // Update circles based on the updated projection
    // svg.selectAll('circle')
    //   .attr('cx', d => projection([d.value.longitude, d.value.latitude])[0])
    //   .attr('cy', d => projection([d.value.longitude, d.value.latitude])[1]);
}

// Create a path generator
// const path = d3.geoPath().projection(projection);

// d3.json('illinois-counties.geojson').then(illinois => {
//     // Draw the map with debugging styles
//     svg.selectAll('path')
//         .data(illinois.features)
//         .enter().append('path')
//         .attr('d', path)
//         .style('fill', 'none') // Set fill to none for debugging
//         .style('stroke', 'red'); // Set a red stroke color for debugging
// });

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

    // Append image elements for each map tile
    svg.selectAll('image')
        .data(tiles)
        .enter().append('image')
        .attr('xlink:href', d => url(d[0], d[1], d[2]))
        .attr('x', d => Math.round((d[0] + tiles.translate[0]) * tiles.scale))
        .attr('y', d => Math.round((d[1] + tiles.translate[1]) * tiles.scale))
        .attr('width', tiles.scale)
        .attr('height', tiles.scale);

    // Example of using the map in the document
    document.body.appendChild(svg.node());

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

    // updateMap();
});


