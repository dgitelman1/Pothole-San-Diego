let gdata = [];
let potholes = [];
let pothole_count = [];
let valid_zip = [];

let projection = d3.geoMercator();
let path = d3.geoPath().projection(projection);

const to_remove = ['91901', '91905', '91906', '92028', '92036', '92058', '92058', '91916', '91934', '91935', '91917', '91931', '91948', '91962', '92058', '92058', '92058', '91963', '91980', '92003', '92027', '92004', '92019', '92021', '92026', '92040', '92054', '92055', '92056', '92057', '92058', '92058', '92058', '92059', '92060', '92061', '92065', '92083', '92083', '92084', '92086', '92066', '92069', '92070', '92081', '92082', '92259', '92536', '92672'];


// Function to load JSON data
async function loadGeoData() {
    try {
        let url_g = 'https://data.sandiegocounty.gov/api/geospatial/vsuf-uefy?method=export&format=GeoJSON'
        const response_g = await fetch(url_g); 
        if (!response_g.ok) {
            throw new Error(`HTTP error! status: ${response_g.status}`);
        }
        const data = await response_g.json();
        gdata = data
        let url = 'https://raw.githubusercontent.com/dgitelman1/potholedata/main/get_it_done_pothole_requests_datasd.csv'
        const response = d3.csv(url).then((data) => {
            potholes = data;
            pothole_count = d3.rollup(potholes, (v) => v.length, (d) => d.zipcode);
            gdata.features = gdata.features.filter((d) => !to_remove.includes(d.properties.zip));
            valid_zip = gdata.features.map((d) => d.properties.zip);
            draw_map();
        });
        
    } catch (error) {
        console.error('Could not load data:', error);
    }
}

async function full_load(){
    await loadGeoData();
    document.getElementById("loading-image").style.display="none";
}

// Map display functions

function draw_map() {
    const svg = d3.select('#map');
    svg.attr('display', 'block')
    const width = svg.attr('width');
    const height = svg.attr('height');
    projection.fitSize([width, height], gdata);
    svg.selectAll('path')
    .data(gdata.features)
    .enter()
    .append('path')
    .on('click', clicked)
    .on('mouseover', (event, d) => {
        const tooltip = d3.select('#tooltip');
        tooltip.transition()
        .duration(200)
        .style('opacity', 0.9)
        .style('position', 'absolute')
        .style('background-color', 'white')
        .style('padding', '8px')
        .style('border', '1px solid #ccc')
        .style('border-radius', '5px')
        .style('font-size', '12px');

        // Set tooltip content
        tooltip.html(`Zipcode: ${d.properties.zip} <br> Pothole Count: ${z_count(d.properties.zip)}`)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 20) + 'px');
    })
    .on('mousemove', function (event) {
        d3.select('#tooltip')
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 20) + 'px');
    })
    .on('mouseout', () => {
        d3.select('#tooltip')
        .transition()
        .duration(250)
        .style('opacity', 0);
    })
    .attr('d', path)
    .attr('id', function (d) {return d.properties.zip;})
    .style('stroke', 'black');

    let dens_extent = density();
    const scale = d3.scaleLinear([dens_extent[0], dens_extent[1]], ['grey', 'red']);

    svg.selectAll('path').style(
      'fill',
      function (d) {
        let zip_count = z_count(d.properties.zip)
        return scale(zip_count / this.getTotalLength());
      }
    );
    generate_potholes(.1, potholes, svg, 'black');
  }

  function display_segment(z){
    const svg1 = d3.select('#map');
    svg1.attr('display', "none")
    const svg = d3.select('#map1');
    svg.attr('display', "block")
    const width = svg.attr('width');
    const height = svg.attr('height');
    d3.select('#tooltip')
    .transition()
    .duration(500)
    .style('opacity', 0);
    svg.selectAll('circle').remove();
    svg.selectAll('path').remove();
    let sdata = JSON.parse(JSON.stringify(gdata));
    sdata.features = sdata.features.filter((d) => d.properties.zip == z);
    projection.fitSize([width, height], sdata);
    svg.selectAll('path')
        .data(sdata.features)
        .enter()
        .append('path')
        .on('click', revert)
        .attr('d', path)
        .attr('id', function (d) {
        return d.properties.zip;
        })
        .style('stroke', 'black')
        .style('fill', 'grey');
    generate_potholes(1.5, d3.group(potholes, (d) => d.zipcode).get(z), svg, 'red');
}

// Event functions

// Displays new segment on click
function clicked(event, d) {
    let z = d.properties.zip
    document.getElementById("zip-container").innerText = d.properties.zip;
    display_segment(z);
}

// Reverts to full map on click
function revert(event, d) {
    const svg = d3.select('#map1');
    svg.attr('display', "none")
    document.getElementById("zip-container").innerText = "Full Map;
    draw_map();
}

// Utility functions

// Returns the density of potholes in an area of the map for color scale
function density() {
    const svg = d3.select('#map');
    return d3.extent(svg.selectAll('path')._groups[0], function (d) {
        let zip_count = z_count(d.__data__.properties.zip);
        return zip_count / d.getTotalLength();
        });
}

// Returns the count of potholes in a given zipcode
function z_count(zip) {
    let zip_count = pothole_count.get(zip);
    if (zip_count == undefined) {
      return 0;
    } else {
      return zip_count;
    }
  }

// Generates potholes for the given args
function generate_potholes(radius, pdata, svg, color) {
    svg.selectAll('circle')
    .data(pdata)
    .enter()
    .append('circle')
    .attr('cx', (d) => projection([d.lng, d.lat])[0])
    .attr('cy', (d) => projection([d.lng, d.lat])[1])
    .attr('r', radius)
    .style('fill', color);
}

function zipEventResponse(){
    document.getElementById('sbutton').addEventListener('click', function() {
        let input = document.getElementById('search').value
        if (!valid_zip.includes(input)){
            console.log(error)
        }else{
            display_segment(input)
        }
    })
    document.getElementById('rbutton').addEventListener('click', function() {
        revert()
    })
}

// Load data when the page loads
window.addEventListener('DOMContentLoaded', (event) => {
    full_load();
    zipEventResponse();
    createLegend();
    document.getElementById("maps").style.margin = "50px 10px 20px 30px";
});

function createLegend() {
    const legendSVG = d3.select("#legend-container")
        .append("svg")
        .attr("class", "legend")
        .attr("width", 700)
        .attr("height", 40);

    const legendRectSize = 20;

    let dens_extent = density();

    const legendScale = d3.scaleLinear()
        .domain([dens_extent[0], dens_extent[1]])
        .range(['grey', 'red']);

    const gradient = legendSVG.append("linearGradient")
        .attr("id", "legendGradient")
        .attr("x1", "0%")
        .attr("x2", "100%");

    gradient.selectAll("stop")
        .data(legendScale.range())
        .enter().append("stop")
        .attr("offset", (d, i) => i * 100 + "%")
        .attr("stop-color", d => d);

    legendSVG.append("rect")
        .attr("width", 700)
        .attr("height", legendRectSize)
        .style("fill", "url(#legendGradient)");


    legendSVG.append("text")
        .attr("x", 350) 
        .attr("y", 30)  
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("fill", "#00000")
        .style("font-family", "Gill Sans")
        .text("Pothole Density"); 

    legendSVG.append("text")
        .attr("x", 0)
        .attr("y", 30)
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("fill", "#00000")
        .style("font-family", "Gill Sans")
        .text("Low Pothole Density"); 

    legendSVG.append("text")
        .attr("x", 700)
        .attr("y", 30)
        .style("font-size", "12px")
        .style("text-anchor", "end")
        .style("font-weight", "bold")
        .style("fill", "#00000")
        .style("font-family", "Gill Sans")
        .text("High Pothole Density");

}


