let gdata = [];
let potholes = [];
let pothole_count = [];

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
        gdata = data;
        gdata.features = gdata.features.filter((d) => !to_remove.includes(d.properties.zip));
        draw_map();
        
    } catch (error) {
        console.error('Could not load data:', error);
    }
}

async function loadData() {
    try {
        let url = 'https://raw.githubusercontent.com/dgitelman1/potholedata/main/get_it_done_pothole_requests_datasd.csv'
        const response = d3.csv(url).then((data) => {
            potholes = data;
            pothole_count = d3.rollup(potholes, (v) => v.length, (d) => d.zipcode);
        });
        
    } catch (error) {
        console.error('Could not load data:', error);
    }
}

function draw_map() {
    const svg = d3.select('#map');
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
        .duration(500)
        .style('opacity', 0);
    })
    .attr('d', path)
    .attr('id', function (d) {return d.properties.zip;})
    .style('stroke', 'black');

    const scale = d3.scaleLinear([density(0), density(1)], ['grey', 'red']);

    svg.selectAll('path').style(
      'fill',
      function (d) {
        let zip_count = pothole_count.get(d.properties.zip);
        if (zip_count == undefined) {
          zip_count = 0;
        }
        return scale(zip_count / this.getTotalLength());
      }
    );
    generate_potholes(.1, potholes, svg, 'black');
  }

function clicked(event, d) {
    let z = d.properties.zip;
    view = d.properties.community;
    current_zip = z;
    p_c = z_count(z);
    display_segment(z);
}

function revert(event, d) {
    const svg = d3.select('#map');
    svg.selectAll('path').remove();
    svg.selectAll('circle').remove();
    draw_map();
}

function density(m) {
    const svg = d3.select('#map');
    if (m == 1) {
        return d3.max(svg.selectAll('path')._groups[0], function (d) {
        let zip_count = z_count(d.__data__.properties.zip);
        return zip_count / d.getTotalLength();
        });
    } else {
        return d3.min(svg.selectAll('path')._groups[0], function (d) {
        let zip_count = z_count(d.__data__.properties.zip);
        return zip_count / d.getTotalLength();
        });
    }
}


function z_count(zip) {
    let zip_count = pothole_count.get(zip);
    if (zip_count == undefined) {
      return 0;
    } else {
      return zip_count;
    }
  }

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


function search_zipcode() {
    let input = document.getElementById('search').value
    console.log(input)
  }

function display_segment(z){
    const svg = d3.select('#map');
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



// Load data when the page loads
window.addEventListener('DOMContentLoaded', (event) => {
    loadData();
    loadGeoData();
});

