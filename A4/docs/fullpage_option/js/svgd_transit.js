(function(vegaEmbed) {
  var spec = {"config": {"view": {"continuousWidth": 400, "continuousHeight": 300, "strokeOpacity": 0}},
      "layer": [{"mark": {"type": "geoshape", "stroke": "black", "strokeWidth": 1},
          "encoding": {}, "height": 400, "width": 400},
          {"mark": {"type": "geoshape", "stroke": "black"},
              "encoding": {"color": {"type": "quantitative", "field": "density",
                      "scale": {"domain": [0, 1], "scheme": "cividis"},
                      "title": "Transit Density"}}},
          {"data": {"url": "data/seattle/transit_svgd.json", "format": {"type": "json"}},
              "mark": {"type": "circle", "color": "purple", "opacity": 0.7, "stroke": "gray"},
              "encoding": {"latitude": {"field": "lat", "type": "quantitative"},
                  "longitude": {"field": "long", "type": "quantitative"}},
              "selection": {"iteration": {"type": "single",
                      "bind": {"input": "range", "max": 69, "min": 1, "name": "Move stations with slider", "step": 1},
                      "init": {"iteration": 0}}},
              "transform": [{"filter": {"selection": "iteration"}}]}],
      "data": {"url": "data/seattle/transit_pronto_stations_density.json",
          "format": {"type": "json"}},
      "$schema": "https://vega.github.io/schema/vega-lite/v4.8.1.json",
        "background": null};
  var embedOpt = {"mode": "vega-lite"};

  function showError(el, error){
      el.innerHTML = ('<div class="error" style="color:red;">'
                      + '<p>JavaScript Error: ' + error.message + '</p>'
                      + "<p>This usually means there's a typo in your chart specification. "
                      + "See the javascript console for the full traceback.</p>"
                      + '</div>');
      throw error;
  }
  const el = document.getElementById('svgd_transit');
  vegaEmbed("#svgd_transit", spec, embedOpt)
    .catch(error => showError(el, error));
})(vegaEmbed);