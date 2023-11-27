// mapScript.js

// Define the size of the map
const width = window.innerWidth*0.9; //1000;
const height = window.innerHeight*0.9; //800;
var proj_scale = 60000;
var projX = width/2;
var projY = height/2;

// Create an SVG container
const svg = d3.select('body').append('svg')
    .attr('width', width)
    .attr('height', height);

// const g = svg.append("g");

// Define a projection (you can experiment with different projections)
const projection = d3.geoMercator()
    .center([-87.6298, 41.8781]) // Adjusted center for the Chicagoland region
    .scale(proj_scale) // Zoom in on Chicagoland region
    .translate([projX, projY]);

// Set up the tile generator
var tile = d3.tile()
  .size([width, height])
  .scale(proj_scale* 2 * Math.PI) // * 2 * Math.PI
  .translate(projection([0, 0]))

// Generate tiles
var tiles = tile();

// Assuming you have a function 'url' for generating tile URLs
function url(x, y, z) {
  // Return tile URL
//   return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  return `https://tiles.stadiamaps.com/tiles/stamen_toner_lite/${z}/${x}/${y}.png`
}

// IMPLEMENT ZOOMING/DRAGGING
function zoomIn() {
  // handle scaling, translating
  const newTransform = d3.event.transform;

  // scale/translate current projection
  var newScale = proj_scale*newTransform.k;

  projection
    .center([-87.6298, 41.8781]) // Adjusted center for the Chicagoland region
    .scale(newScale) // Zoom in on Chicagoland region
    .translate([projX + newTransform.x, projY + newTransform.y]);

  // Update the map tiles and circles based on the new projection
  updateMap(newScale, newTransform.x, newTransform.y);
}

const zoom = d3.zoom()
  .scaleExtent([1, 10]) // min/max zoom levels
  .extent([[0, 0], [width, height]])
  .on("zoom", zoomIn);

// Apply zoom behavior to SVG container
svg.call(zoom);

// Function to update map tiles and circles
function updateMap(newScale, newX, newY) {
    // Set up the tile generator
    tile = d3.tile()
        .size([width, height])
        .scale(newScale* 2 * Math.PI) // * 2 * Math.PI
        .translate(projection([0, 0]))
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

    // document.body.appendChild(svg.node());
    // Update circles based on the updated projection
    svg.selectAll('circle')
      .attr('cx', d => projection([d.value.longitude, d.value.latitude])[0])
      .attr('cy', d => projection([d.value.longitude, d.value.latitude])[1]);

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
    // Add event listener for the slider
    const slider = document.getElementById('year-slider');
    const selectedYear = document.getElementById('selected-year');
    var year = 2023;

    // Convert month_beginning column to date objects
    data.forEach(d => {
        d.month_beginning = new Date(d.month_beginning);
    });

    // Update the year displayed by slider
    slider.addEventListener('input', function() {
        year = this.value;
        selectedYear.textContent = year;
        // updateVisualization(data, +year);
    });

    // Aggregate data by station
    const aggregatedData = d3.nest()
    .key(d => d.station_id)
    .rollup(stationGroup => ({
      totalRidership: d3.sum(stationGroup, d => +d.avg_weekday_rides),
      latitude: +stationGroup[0].latitude,
      longitude: +stationGroup[0].longitude,
      station_id: +stationGroup[0].station_id,
      years: d3.nest() // Calculates total ridership per year
        .key(d => d.month_beginning.getFullYear())
        .rollup(yearGroup => ({
          yearlyTotal: d3.sum(yearGroup, d => +d.monthtotal),
        }))
        .entries(stationGroup),
    }))
    .entries(data);

    // console.log("aggData: ",aggregatedData);

    // Find the highest yearly total, across all stations (only during that year)
    const yearlyTotalsForYear = aggregatedData
                                .map(station => ({
                                  yearlyTotal: station.value.years.find(yr => yr.key == year)?.value.yearlyTotal || 0,
                                }));
    const highestYearlyTotal = d3.max(yearlyTotalsForYear, d => d.yearlyTotal);

    // Scale for circle size based on total ridership
    const sizeScale = d3.scaleSqrt()
        .domain([0, highestYearlyTotal])
        .range([2, 20]); // Adjust the range for desired circle sizes

    // Color scale for fill color based on total ridership
    const colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, highestYearlyTotal]);

    // CREATE MAP IN DESIRED AESTHETIC
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
        .attr("class", "circle")
        .attr('cx', d => projection([d.value.longitude, d.value.latitude])[0])
        .attr('cy', d => projection([d.value.longitude, d.value.latitude])[1])
        .attr('r', d => {const yearlyTotal = d.value.years.find(yr => yr.key == year).value.yearlyTotal;
                         return sizeScale(yearlyTotal);
                        })
        .style('fill', d => {const yearlyTotal = d.value.years.find(yr => yr.key == year).value.yearlyTotal;
                              // console.log("d: ",d);
                             return colorScale(yearlyTotal);
                            })
        .style('opacity', 0.7) // Adjust the circle opacity
        .style('stroke', 'black') // Set a black stroke color for debugging
        .style('stroke-width', 1)// Set a stroke width for debugging
        .on('click', (event, d) => {
          console.log("event: ",event);
          // console.log("d: ",d);
          const station = event.value.station_id; // Replace with the appropriate field from your data
          // console.log("station_id: ",station);

          // Call a function to update the plot based on the clicked station
          updatePlot(data, station, year);
        });

    // Update the year displayed by slider
    slider.addEventListener('input', function () {
      updateVisualization(aggregatedData, +year, svg);
    });    

});

// Function to update the visualization based on the selected year
function updateVisualization(aggregatedData, year, svg) {
  // Extract yearly totals for the target year from each station
  const yearlyTotalsForYear = aggregatedData
    .map(station => ({
      yearlyTotal: station.value.years.find(yr => yr.key == year)?.value.yearlyTotal || 0,
    }));
  const highestYearlyTotal = d3.max(yearlyTotalsForYear, d => d.yearlyTotal);

  // Scale for circle size based on total ridership
  const sizeScale = d3.scaleSqrt()
  .domain([0, highestYearlyTotal])
  .range([2, 20]); // Adjust the range for desired circle sizes

  // Color scale for fill color based on total ridership
  const colorScale = d3.scaleSequential(d3.interpolateBlues)
  .domain([0, highestYearlyTotal]);

  // Map the aggregated data to the stations on the map
  svg.selectAll('circle')
      .data(aggregatedData)
      .join(
          enter => enter.append('circle')
              .attr('class', 'circle')
              .attr('cx', d => projection([d.value.longitude, d.value.latitude])[0])
              .attr('cy', d => projection([d.value.longitude, d.value.latitude])[1])
              .attr('r', d => {
                  const yearlyTotal = d.value.years.find(yr => yr.key == year)?.value.yearlyTotal || 0;
                  return sizeScale(yearlyTotal);
              })
              .style('fill', d => {
                  const yearlyTotal = d.value.years.find(yr => yr.key == year)?.value.yearlyTotal || 0;
                  return colorScale(yearlyTotal);
              })
              .style('opacity', 0.7)
              .style('stroke', 'black')
              .style('stroke-width', 1),
          update => update
              .attr('r', d => {
                  const yearlyTotal = d.value.years.find(yr => yr.key == year)?.value.yearlyTotal || 0;
                  return sizeScale(yearlyTotal);
              })
              .style('fill', d => {
                  const yearlyTotal = d.value.years.find(yr => yr.key == year)?.value.yearlyTotal || 0;
                  return colorScale(yearlyTotal);
              }),
          exit => exit.remove()
      );
}

// function to update plot, does not work
function updatePlot(data, station, selectedYear) {
    // Filter data for the clicked station and selected year
    // console.log("data?: ",data, station);
    const stationData = data.filter(d => {
        return d.station_id == station && d.month_beginning.getFullYear() == selectedYear;
    });

    // Extract necessary information for plotting, from filtered data
    const months = stationData.map(d => d.month_beginning.getMonth() + 1); // 1-indexed months
    const monthtotals = stationData.map(d => d.monthtotal);

    const whiteBox = d3.select('#white-box'); // Assuming the white box has an ID 'white-box'
    var rect = whiteBox.node().getBoundingClientRect(); // get its computed size
    // console.log(whiteBox);
    whiteBox.html(''); // Clear previous content
  
    const xScale = d3.scaleLinear()
      .domain([1, 12])
      .range([0+5, rect.width-5]);
  
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(monthtotals)])
      .range([rect.height-25, 0+30]);

    // Make SVG container
    const svgPlot = whiteBox.append('svg')
      .attr('width', rect.width)
      .attr('height', rect.height);
    
    // Add x-axis
    svgPlot.append("g")
      .attr("transform", "translate(" +  0.2*rect.width +","+ rect.height*.9 + ")")
      .call(d3.axisBottom(xScale));
    // Add y-axis
    svgPlot.append("g")
      .attr("transform", "translate("+0.2*rect.width+",0)")
      .call(d3.axisLeft(yScale)); 

    svgPlot.append('g')
      .selectAll("dot")
      .data(stationData)
      .enter()
      .append("circle")
      .attr("cx", (d) => {const m = d.month_beginning.getMonth() + 1;
                          console.log("Month: ",m)
                          console.log("MonthScaled: ", xScale(m));
                          return xScale(m);
                         } 
        )
      .attr("cy", (d) => {const monthTot = d.monthtotal;
                          // console.log(yScale(monthTot));
                          return yScale(monthTot);
                         } )
      .attr("transform", "translate("+0.2*rect.width+",0)")
      .style('fill','red')
      .attr("r", 2);

    var line = d3.line()
      .x(function(d) { const m = d.month_beginning.getMonth() + 1;
                       return xScale(m); }) 
      .y(function(d) { const monthTot = d.monthtotal;
                          return yScale(monthTot); }) 
      .curve(d3.curveMonotoneX);
      
    svgPlot.append("path")
      .datum(stationData) 
      .attr("class", "line") 
      .attr("transform", "translate("+0.2*rect.width+",0)")
      .attr("d", line)
      .style("fill", "none")
      .style("stroke", "#CC0000")
      .style("stroke-width", "2");


    // Title
    svgPlot.append('text')
    .attr('x', rect.width/2)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .style('font-family', 'Helvetica')
    .style('font-size', 15)
    .text('Monthly Ridership');
    
    // X label
    svgPlot.append('text')
    .attr('x', rect.width/2)
    .attr('y', rect.height)
    .attr('text-anchor', 'middle')
    .attr('transform', 'translate(0,' + -rect.height*.02 + ')')
    .style('font-family', 'Helvetica')
    .style('font-size', 12)
    .text('Month');
    
    // Y label
    svgPlot.append('text')
    .attr('text-anchor', 'middle')
    .attr('transform', 'translate('+ 0.05*rect.width + "," + rect.height/2 + ')rotate(-90)')
    .style('font-family', 'Helvetica')
    .style('font-size', 12)
    .text('Ridership');
}