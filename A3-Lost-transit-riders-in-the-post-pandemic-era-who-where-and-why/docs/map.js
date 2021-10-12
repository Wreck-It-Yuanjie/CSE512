(async function () {
  const mapContainer = d3.select("#map");

  const width = 600;
  const height = 700;

  const projection = d3
    .geoMercator()
    .center([-122.327, 47.6348])
    .scale(Math.pow(2, 21) / (2 * Math.PI))
    .translate([width / 2, height / 2]);

  const tile = d3
    .tile()
    .size([width, height])
    .scale(projection.scale() * 2 * Math.PI)
    .translate(projection([0, 0]));

  function url(x, y, z) {
    return `https://stamen-tiles-${
      "abc"[Math.abs(x + y) % 3]
    }.a.ssl.fastly.net/toner-lite/${z}/${x}/${y}${
      devicePixelRatio > 1 ? "@2x" : ""
    }.png`;
  }

  const map = mapContainer
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  const tiles = tile();

  tiles.forEach(([x, y, z], i, { translate: [tx, ty], scale: k }) => {
    map
      .append("image")
      .attr("xlink:href", `${url(x, y, z)}`)
      .attr("x", `${Math.round((x + tx) * k)}`)
      .attr("y", `${Math.round((y + ty) * k)}`)
      .attr("width", `${k}`)
      .attr("height", `${k}`);
  });

  const stations = await fetch("./data/station.json")
    .then((response) => response.json())
    .then((d) => d);

  const features = stations.features;

  const nhood_names = d3.set(features.map((d) => d.properties.nhood)).values();

  const color = d3.scaleOrdinal().domain(nhood_names).range(d3.schemeTableau10);

  // ---------------------------TOOLTIP-----------------------------------

  // create tooltip
  var tooltip = mapContainer
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "2px")
    .style("border-radius", "3px")
    .style("padding", "3px")
    .style("font-size", "small")
    .style("opacity", 0);

  // Three function that change the tooltip when user hover / move / leave a cell
  var mouseover = function (event, d) {
    tooltip.style("opacity", 1);

    d3.select(this).style("stroke", "black").style("fill-opacity", 1);
  };

  var mousemove = function (event, d) {
    tooltip
      .html(
        "<strong>" +
          "Station: " +
          "</strong>" +
          d.properties.name +
          "<br/>" +
          "<strong>" +
          "Neighborhood: " +
          "</strong>" +
          d.properties.nhood
      )

      .style("left", event.pageX + 10 + "px")
      .style("top", event.pageY - 20 + "px");
  };

  var mouseleave = function (event, d) {
    tooltip.style("opacity", 0);
    d3.select(this).style("stroke", "#fff").style("fill-opacity", 0.7);
  };

  var mouseclick = function (event, d) {
    update_link(d.properties.station_id)

    // TODO: Double check function names from Tukey
    d3.select("#svg_in").selectAll("*").remove()
    d3.select("#svg_out").selectAll("*").remove()
    bar1(d.properties.name)
    bar2(d.properties.name)
  };

  // --------------------------- END TOOLTIP-----------------------------------

  map
    .append("g")
    .selectAll("circle.station")
    .data(features)
    .join("circle")
    .attr("class", "station")
    .attr("transform", (d) => {
      const coordinate = projection(d.geometry.coordinates);
      return `translate(${coordinate})`;
    })
    .attr("fill", (d) => color(d.properties.nhood))
    .attr("fill-opacity", 0.7)
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .attr("r", 6)
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave)
    .on("click", mouseclick);

  // ---------------------------LEGEND-----------------------------------

  function pointLegend(container) {
    const titlePadding = 12; // padding between title and entries
    const entrySpacing = 15; // spacing between legend entries
    const entryRadius = 5; // radius of legend entry marks
    const labelOffset = 4; // additional horizontal offset of text labels
    const baselineOffset = 4; // text baseline offset, depends on radius and font size

    const title = container
      .append("text")
      .attr("x", 0)
      .attr("y", 0)
      .attr("fill", "black")
      .attr("font-family", "Helvetica Neue, Arial")
      .attr("font-weight", "bold")
      .attr("font-size", "11px")
      .text("Neighborhoods");

    const entries = container
      .selectAll("g")
      .data(nhood_names)
      .join("g")
      .attr(
        "transform",
        (d, index) => `translate(0, ${titlePadding + index * entrySpacing})`
      );

    const symbols = entries
      .append("circle")
      .attr("cx", entryRadius) // <-- offset symbol x-position by radius
      .attr("r", entryRadius)
      .attr("fill", (d) => color(d))
      .attr("fill-opacity", 0.7);

    const labels = entries
      .append("text")
      .attr("x", 2 * entryRadius + labelOffset) // <-- place labels to the left of symbols
      .attr("y", baselineOffset) // <-- adjust label y-position for proper alignment
      .attr("fill", "black")
      .attr("font-family", "Helvetica Neue, Arial")
      .attr("font-size", "10px")
      .style("user-select", "none") // <-- disallow selectable text
      .text((d) => d);
  }

  const legend = map
    .append("g")
    .attr("transform", "translate(20, 520)")
    .call(pointLegend);



  // legend for line in/out flows

  const traffic = ["Borrowed out from the station", "Returned to the station"]
  const traffic_color = ["#B22222", "#008000"]

  function lineLegend(container) {
    const titlePadding = 10; // padding between title and entries
    const entrySpacing = 13; // spacing between legend entries
    const entryRadius = 5; // radius of legend entry marks
    const labelOffset = 4; // additional horizontal offset of text labels
    const baselineOffset = 4; // text baseline offset, depends on radius and font size

    const title = container
      .append("text")
      .attr("x", 0)
      .attr("y", 0)
      .attr("fill", "black")
      .attr("font-family", "Helvetica Neue, Arial")
      .attr("font-weight", "bold")
      .attr("font-size", "11px")
      .text("Traffic");

    const entries = container
      .selectAll("g")
      .data(traffic)
      .join("g")
      .attr(
        "transform",
        (d, index) => `translate(0, ${titlePadding + index * entrySpacing})`
      );

    const color_trffic = d3.scaleOrdinal().domain(traffic).range(traffic_color);

    const symbols = entries
      .append("rect")
      .attr('x', 0)
      .attr('y', 0)
      .attr("width", 8)
      .attr("height", 2)
      .attr("fill", (d) => color_trffic(d))
      .attr("fill-opacity", 0.7);

    const labels = entries
      .append("text")
      .attr("x", 2 * entryRadius + labelOffset) // <-- place labels to the left of symbols
      .attr("y", baselineOffset) // <-- adjust label y-position for proper alignment
      .attr("fill", "black")
      .attr("font-family", "Helvetica Neue, Arial")
      .attr("font-size", "10px")
      .style("user-select", "none") // <-- disallow selectable text
      .text((d) => d);
  }

  const legend_line = map
    .append("g")
    .attr("transform", "translate(20, 660)")
    .call(lineLegend);


    


  // ---------------------------LINE-----------------------------------

  const station_links = await fetch("./data/station_agg.json")
    .then((response) => response.json())
    .then((s) => {
      return s.map((d) => {
        return {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [d.long_from, d.lat_from],
              [d.long_to, d.lat_to],
            ],
          },
          properties: d,
        };
      });
    });

  const path = d3.geoPath(projection);

  const linkGroup = map.append("g");

  function update_link(selected_station_id) {
    console.log('hi')
    
    // outflow
    linkGroup
      .selectAll("path.links")
      .data(station_links.filter( (d) => {
        return  d.properties.from_station_id === selected_station_id || 
                d.properties.to_station_id === selected_station_id
      }))
      .join("path")
      .attr("stroke", (d) => {

        if (d.properties.from_station_id === selected_station_id) {
          return "#B22222"
        } else {
          return "#008000"
        }

        })
      .attr("stroke-width", 1.25)
      .attr("opacity", 0.6)
      .attr("d", path)
      .attr("class", "links");

  }
})();