// mapScript.js

// Define the size of the map
const width = window.innerWidth;
const height = window.innerHeight; 
var proj_scale = 800000;
var projX = width/2;
var projY = height/2;

// Create an SVG container
const svg = d3.select('body').append('svg')
    .attr('width', width)
    .attr('height', height);

// const g = svg.append("g");

// Define a projection (you can experiment with different projections)
const projection = d3.geoMercator()
    .center([-87.6251, 41.8786]) // Adjusted center for the Chicagoland region
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
      station_name: stationGroup[0].stationame,
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
        .range([2, 10]); // Adjust the range for desired circle sizes

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

    const defs = svg.append('defs');
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
                        .style('stroke', 'black')
                        .style('stroke-width', 1)
                        .style('fill', d => {
                          const linesForYear = getUniqueLines(data, d.value.station_id)
                              .map(line => getBackgroundColor(line));
                      
                          // Generate a unique ID for the gradient
                          const gradientId = `gradient-${d.value.station_id}`;
                          
                          // Create a linear gradient
                          const linearGradient = defs
                              .append('linearGradient')
                              .attr('id', gradientId)
                              .attr('gradientTransform', 'rotate(0)'); // Rotate the gradient if needed
                          
                          // Add stops for each color with hard stops
                          linesForYear.forEach((color, i) => {
                              linearGradient.append('stop')
                                  .attr('offset', `${i * (100 / linesForYear.length)}%`)
                                  .style('stop-color', color);
                              
                              if (i < linesForYear.length - 1) {
                                  // Add hard stops between colors
                                  const midOffset = (i + 0.5) / (linesForYear.length - 1) * 100;
                                  linearGradient.append('stop')
                                      .attr('offset', `${midOffset}%`)
                                      .style('stop-color', color)
                                      .style('stop-opacity', 1); // Make the hard stop transparent
                              }
                          });
                      
                          // Use the gradient in the circle fill
                          return `url(#${gradientId})`;
                      })
                      
                      
                      
        .style('opacity', 1) // Adjust the circle opacity
        .on('click', (event, d) => {
          console.log("event: ",event);
          // console.log("d: ",d);
          const station = event.value.station_id; // Replace with the appropriate field from your data
          const name = event.value.station_name;
          // console.log("station_id: ",station);

          // Call a function to update the plot based on the clicked station
          updatePlot(data, station, name, year);

          // Create colored line tags
          createLineTags(data, station);
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
              .style('opacity', 0.7),
          update => update
              .attr('r', d => {
                  const yearlyTotal = d.value.years.find(yr => yr.key == year)?.value.yearlyTotal || 0;
                  return sizeScale(yearlyTotal);
              })
              .style('stroke', 'black')
                        .style('stroke-width', 1)
              .style('fill', d => {
                const linesForYear = getUniqueLines(data, d.value.station_id)
                    .map(line => getBackgroundColor(line));
            
                // Generate a unique ID for the gradient
                const gradientId = `gradient-${d.value.station_id}`;
                
                // Create a linear gradient
                const linearGradient = defs
                    .append('linearGradient')
                    .attr('id', gradientId)
                    .attr('gradientTransform', 'rotate(0)'); // Rotate the gradient if needed
                
                // Add stops for each color with hard stops
                linesForYear.forEach((color, i) => {
                    linearGradient.append('stop')
                        .attr('offset', `${i * (100 / linesForYear.length)}%`)
                        .style('stop-color', color);
                    
                    if (i < linesForYear.length - 1) {
                        // Add hard stops between colors
                        const midOffset = (i + 0.5) / (linesForYear.length - 1) * 100;
                        linearGradient.append('stop')
                            .attr('offset', `${midOffset}%`)
                            .style('stop-color', color)
                            .style('stop-opacity', 1); // Make the hard stop transparent
                    }
                });
            
                // Use the gradient in the circle fill
                return `url(#${gradientId})`;
            }),
          exit => exit.remove()
      );
}

// function to update plot, does not work
function updatePlot(data, station, name, selectedYear) {
    // Filter data for the clicked station and selected year
    const stationData = data.filter(d => {
      return d.station_id == station && d.month_beginning.getFullYear() == selectedYear;
  });

  // Sort stationData based on month_beginning
  stationData.sort((a, b) => a.month_beginning - b.month_beginning);

    // Extract necessary information for plotting, from filtered data
    // const months = stationData.map(d => d.month_beginning.getMonth() + 1); // 1-indexed months
    const monthtotals = stationData.map(d => d.monthtotal);

    const plotBox = d3.select('#plot-box'); // Assuming the white box has an ID 'white-box'
    var rect = plotBox.node().getBoundingClientRect(); // get its computed size
    console.log(plotBox);
    plotBox.html(''); // Clear previous content

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
    const xScale = d3.scaleLinear()
      .domain([1, 12])
      .range([0, rect.width - 10]);

    const xAxis = d3.axisBottom(xScale)
      .tickValues([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
      .tickFormat(month => monthNames[month - 1]);

      const yScale = d3.scaleLinear()
      .domain([0, d3.max(monthtotals)])
      .range([rect.height - 25, 0 + 30]);

    // Make SVG container
    const svgPlot = plotBox.append('svg')
      .attr('width', rect.width)
      .attr('height', rect.height);
    
    // Add x-axis
    svgPlot.append("g")
    .attr("transform", "translate(" + 20 + "," + (rect.height - 50) + ")")
    .call(xAxis)
    .selectAll("text") // Select all x-axis text elements
    .style("text-anchor", "end") // Set text-anchor to "end"
    .attr("dx", "-.8em") // Adjust x position
    .attr("dy", ".15em") // Adjust y position
    .attr("transform", "rotate(-45)"); // Rotate the text
    
    // Add y-axis
    svgPlot.append("g")
    .attr("transform", "translate(" + (0.1 * rect.width) + ",0)") // Adjust the x translation
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
        .x(function(d) {
            const m = d.month_beginning.getMonth() + 1;
            return xScale(m);
        })
        .y(function(d) {
            const monthTot = d.monthtotal;
            return yScale(monthTot);
        })
        .curve(d3.curveMonotoneX);

    svgPlot.append("path")
        .datum(stationData)
        .attr("class", "line")
        .attr("transform", "translate(" + 0.2 * rect.width + ",0)")
        .attr("d", line)
        .style("fill", "none")
        .style("stroke", "#CC0000")
        .style("stroke-width", "1");

    // Title
    svgPlot.append('text')
    .attr('x', rect.width/2)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .style('font-size', 15)
    .text('Monthly Ridership for ' + name);
    
    // X label
    svgPlot.append('text')
    .attr('x', rect.width/2)
    .attr('y', rect.height)
    .attr('text-anchor', 'middle')
    .attr('transform', 'translate(0,' + -rect.height*.02 + ')')
    .style('font-size', 12)
    .text('Month');
    
    // Y label
    svgPlot.append('text')
    .attr('text-anchor', 'middle')
    .attr('transform', 'translate('+ 0.05*rect.width + "," + rect.height/2 + ')rotate(-90)')
    .style('font-size', 12)
    .text('Ridership');

    // Update the title in the white-box
    const headerBoxTitle = document.getElementById('header-box').querySelector('h2');
    headerBoxTitle.textContent = `CTA Ridership - ${name}`;
}

// Returns array of unique stations
function getUniqueLines(data, station) {
  // Find the row corresponding to the selected station
  const stationInfo = data.find(d => d.station_id.toString() === station.toString());

  if (!stationInfo) {
      console.error('Station information not found for station_id:', station);
      return;
  }

  // Extract unique lines from the station information
  const linesSet = new Set(Object.keys(stationInfo)
  .filter(key => key !== 'station_id' && key !== 'stationame' && key !== 'month_beginning' && key !== 'Location' && key !== 'latitude' && key !== 'longitude')
  .filter(key => stationInfo[key].toString().toLowerCase() === 'true')
  );

  // Convert the Set back to an array
  return Array.from(linesSet);
}

function createLineTags(data, station) {
  // Convert the Set back to an array
  const lines = getUniqueLines(data, station);

  // Select or create the tagsContainer
  let tagsContainer = d3.select('#header-box').select('.tags-container');
  
  // If the container doesn't exist, create it
  if (tagsContainer.empty()) {
      tagsContainer = d3.select('#header-box').append('p').attr('class', 'tags-container');
  }

  // Clear existing tags
  tagsContainer.selectAll('.tag').remove();

  // Append <span> elements for each line
  const tags = tagsContainer.selectAll('.tag').data(lines);
  tags.enter().append('span').attr('class', 'tag').text(d => getTrainName(d))
      .style('background-color', d => getBackgroundColor(d)) // Apply background color based on line name
      .style('color', 'white')
      .style('border-radius', '5px')
      .style('padding', '5px')
      .style('margin-right', '5px');
}

// Function to get background color based on line name
function getBackgroundColor(lineName) {
    // Define colors for each line name
    const colorMap = {
        'red': '#c60c30',
        'blue': '#00a1de',
        'g': '#009b3a',
        'brn': '#62361b',
        'p': '#522398',
        'pexp': '#522398',
        'y': '#f9e300',
        'pnk': '#e27ea6',
        'o': '#f9461c'
    };

    // Return the color for the given line name
    return colorMap[lineName.toLowerCase()] || 'lightgray'; // Default to gray if color not found
}

function getTrainName(colorAbbr) {
  // colorAbbr to actual color name
  const trainColorMap = {
      'red': 'Red',
      'blue': 'Blue',
      'g': 'Green',
      'brn': 'Brown',
      'p': 'Purple',
      'pexp': 'PurpleExpress',
      'y': 'Yellow',
      'pnk': 'Pink',
      'o': 'Orange'
  }

  return trainColorMap[colorAbbr.toLowerCase()] || 'lightgray';
}