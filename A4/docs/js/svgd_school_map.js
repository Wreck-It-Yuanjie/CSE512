(async function () {
  // --------------------------- Define the map backdrop ---------------------------
  const mapContainer = d3.select("#svgd_school_map_container");

  const width = 900;
  const height = 1250;

  const projection = d3
    .geoMercator()
    .center([-122.327, 47.625])
    .scale(Math.pow(2, 21) / (2 * Math.PI))
    .translate([width / 2, height / 2]);

  const tile = d3
    .tile()
    .size([width, height])
    .scale(projection.scale() * 2 * Math.PI)
    .translate(projection([0, 0]));

  function url(x, y, z) {
    return `https://cartodb-basemaps-${
      "abc"[Math.abs(x + y) % 3]
    }.global.ssl.fastly.net/dark_all/${z}/${x}/${y}${
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

  // --------------------------- Create groups for entities needed ---------------------------

  const points = map.append("g");

  const stations = await fetch("./data/station.json")
    .then((response) => response.json())
    .then((d) => d);

  const stations_svgd = await fetch("./data/seattle/POI_school_svgd.json")
  .then((response) => response.json())
  .then((d) => d);

  // ----- SLIDER ---- //
  var inputValue = null;
  // iters corresponds to slider values. Same max as defined in timeslide
  var maxiters = Number(d3.select("#timeslide_school").attr("max"))
  var iters = [...Array(maxiters).keys()]

  points
    .selectAll("circle.school_svgd_station")
    .data(stations_svgd)
    .join("circle")
    .attr("class", "school_svgd_station")
    .attr("transform", (d) => {
      const coordinate = projection([d.long, d.lat]);
      return `translate(${coordinate})`;
    })
    .attr("r", 6)
      .attr("fill", initialFill)
      .attr("fill-opacity", initialFillOpacity)


  // when the input range changes update the value
  d3.select("#timeslide_school").on("input", function() {
        update(+this.value);
    });

  // update the fill of each SVG of class "station"
  function update(value) {
      // document.getElementById("range").innerHTML=iters[value];
      inputValue = iters[value];
      d3.selectAll(".school_svgd_station")
          .attr("fill", iterMatchFill)
          .attr("fill-opacity", iterMatchFillOpacity)
  }

  // function to match iteration selected to iteration in dataset
    function iterMatchFill(data, value) {
      var d = data.iteration;
      var idx = iters[d];
      if (inputValue === idx) {
          return "#e5c7a9";
      } else {
          return null;
      };
    }

    function iterMatchFillOpacity(data, value) {
      var d = data.iteration;
      var idx = iters[d];
      if (inputValue === idx) {
          // this.parentElement.appendChild(this);
          return 0.7;
      } else {
          return 0.0;
      };
    }

    // function to match iteration selected to iteration in dataset
    function initialFill(data, value) {
      var d = data.iteration;
      var idx = iters[d];
      if (idx === 0) {
          this.parentElement.appendChild(this);
          return "#e5c7a9";
      } else {
          return null;
      };
    }

    function initialFillOpacity(data, value) {
      var d = data.iteration;
      var idx = iters[d];
      if (idx === 0) {
          this.parentElement.appendChild(this);
          return 0.7;
      } else {
          return 0.0;
      };
    }


})();