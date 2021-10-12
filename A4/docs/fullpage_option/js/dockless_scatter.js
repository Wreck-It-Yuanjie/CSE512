(function(vegaEmbed) {
  var spec = {"config": {"view": {"continuousWidth": 400, "continuousHeight": 300}}, "layer": [{"data": {"url": "data/seattle/dockless_data.json", "format": {"type": "json"}}, "mark": "circle", "encoding": {"size": {"type": "quantitative", "field": "TripCount", "scale": {"domain": [50, 3000]}}, "x": {"type": "quantitative", "field": "LatitudeEnd_T", "scale": {"domain": [47.47, 47.73]}}, "y": {"type": "quantitative", "field": "LongitudeEnd_T", "scale": {"domain": [-122.44, -122.24], "zero": false}}}, "selection": {"Time of day:": {"type": "single", "fields": ["daypart_End"], "bind": {"input": "select", "options": ["Weekend", "Night", "Mid-Day", "PM Peak", "AM Peak"]}}}, "transform": [{"filter": {"selection": "Time of day:"}}]}, {"data": {"url": "data/pronto/pronto_stations.json", "format": {"type": "json"}}, "mark": {"type": "point", "color": "red", "opacity": 0.3, "shape": "diamond", "size": 50}, "encoding": {"x": {"type": "quantitative", "field": "lat", "scale": {"zero": false}}, "y": {"type": "quantitative", "field": "long", "scale": {"zero": false}}}}], "$schema": "https://vega.github.io/schema/vega-lite/v4.8.1.json"};
  var embedOpt = {"mode": "vega-lite"};

  function showError(el, error){
      el.innerHTML = ('<div class="error" style="color:red;">'
                      + '<p>JavaScript Error: ' + error.message + '</p>'
                      + "<p>This usually means there's a typo in your chart specification. "
                      + "See the javascript console for the full traceback.</p>"
                      + '</div>');
      throw error;
  }
  const el = document.getElementById('dockless_scatter');
  vegaEmbed("#dockless_scatter", spec, embedOpt)
    .catch(error => showError(el, error));
})(vegaEmbed);