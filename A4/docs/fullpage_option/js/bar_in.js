// set up canvas
function bar1(selected_stations){
              var adj = 20;
              var padding = 5;
              var margin = 10,
              width_svg = 500 - 2*margin,
              height_svg = 320 - 2*margin;

              // set up the svg object
              // append a group element to svg
              // move the group element to the top left margin
              var svg_in = d3.select("#svg_in").append("g")
              .attr("width", width_svg + 2*margin)
              .attr("height", height_svg + 2*margin)
              .attr("preserveAspectRatio", "xMinYMin meet")
              .style("margin", margin)
              .classed("svg-content", true)
              .attr("viewBox", "-" + adj + " -"+ adj + " " + (width_svg + adj) + " " + (height_svg + adj*2))
              .style("padding", padding)
              .append("g")
              .attr("transform",
              "translate(" + margin + "," + margin + ")");

              // import the data
              d3.csv("./data/pronto/trips_cleaned_reduced.csv").then(function(data) {

                   // examine the data
                   //console.log(data)

                   function groupdata(){
                    //filter rows that belong to the selected station
                   filter_data = data.filter(function(d) {return d.from_station_name == selected_stations})
                   //console.log(filter_data)
                   //aggregate function
                   const groupBydata = filter_data.reduce((acc, it) => {
                      acc[it.to_station_name] = acc[it.to_station_name] + 1 || 1;
                      return acc;
                    }, {});

                   console.log(groupBydata)

                   //Splitting an object into an array of objects
                   
                   const separateObject = groupBydata => {
                   const res = [];
                   obj = {}
                   const keys = Object.keys(groupBydata);
                   keys.forEach(key => {
                    //console.log(key)
                    //console.log(groupBydata[key])
                    obj = {Station: key, Counts: groupBydata[key]}
                      res.push(
                         obj
                      );
                   });
                   return res;
                  };

                  return(separateObject(groupBydata));

                   //console.log(groupBydata)

                   }

                   inputdata = groupdata()

                   //console.log(inputdata)

                   // Plot barchart
                   function draw_bar_chart_in(){
                    bar_data = inputdata.sort((a,b) => {return b.Counts - a.Counts})
                    //console.log(bar_data)

                    var xScale = d3.scaleBand()
                    .rangeRound([0, width_svg])
                    .domain(bar_data.map(function(d) {return d.Station;}));

                    var yScale = d3.scaleLinear()
                    .rangeRound([height_svg, 0])
                    .domain([0, d3.max(bar_data, function(d) {return parseInt(d.Counts);})]);

                    //color = d3.scaleOrdinal(d3.schemeCategory10).domain(bar_data.map(d => d.Station));

                    // ---------------------------TOOLTIP-----------------------------------

                    // create tooltip
                    var tooltip_in = d3
                    .select(".tooltip")

                    // Three function that change the tooltip when user hover / move / leave a cell
                    var mouseover = function (event, d) {
                      console.log("Hello!")
                      tooltip_in.style("display", "inline")

                      //d3.select(this).style("stroke", "black").style("fill-opacity", 1);
                    };

                    var mousemove = function (event, d) {
                      tooltip_in
                        .html(
                          "<strong>" +
                            "Station: " +
                            "</strong>" +
                            d.Station+
                            "<br/>" +
                            "<strong>" +
                            "Flow counts: " +
                            "</strong>" +
                            d.Counts
                        )

                        .style("left", event.pageX + 10 + "px")
                        .style("top", event.pageY - 20 + "px");
                    };

                    // --------------------------- END TOOLTIP-----------------------------------


                    // define mouse events

                    //add bars
                    var bar = svg_in.selectAll(".bar")
                    .data(bar_data)
                    .join("rect")
                    .attr("class", "bar")
                    .attr("x", function(d) {return 40 + xScale(d.Station);})
                    //.attr("cy", yScale(0))
                    .attr("y", function(d) {return yScale(d.Counts);})
                    .attr("fill", "grey")
                    .style("stroke", "white")
                    .attr("opacity", 0.5)
                    .style('border', '1px solid white')
                    .attr("width", xScale.bandwidth()*1)
                    .attr("height", function(d) {return height_svg - yScale(d.Counts);})
                    .on("mouseover", mouseover)
                    .on("mousemove", mousemove)
                    .on('mouseenter', function (actual, i) {
                      /*d3.selectAll(".station")
                      .attr('r', (d) => {
                      if (d.properties.to_station_id === this.Station) {
                        return 10
                      } else {
                        return 6
                      }})*/

                        d3.select(this)
                        .attr('opacity', 1)
                        .transition()
                        .duration(300)
                        .attr("x", function(d) {return xScale(d.Station) + 35;})
                        .attr("fill", "#492a7c")
                        .attr('width', xScale.bandwidth()*1.5)
                    })
                    // cancel tooltip
                    .on('mouseleave', function (actual, i) {

                       tooltip_in.style("display", "none");
                        d3.select(this).attr('opacity', 0.5)
                        .transition()
                        .duration(300)
                        .attr("x", function(d) {return 40 + xScale(d.Station);})
                        .attr("fill", "grey")
                        .style("stroke", "white")
                        .attr('width', xScale.bandwidth()*1)
                    })


                    //add text on the bar
                    /*var bar_text = svg_in.selectAll(".text")
                    .data(bar_data)
                    .join("text")
                    .text(d => d.Counts)
                    .attr("x", function(d) {return xScale(d.Station);})
                    .attr("y", function(d) {return yScale(d.Counts);})
                    .attr('dx', +4)
                    .attr('dy', -4)
                    .attr('fill', 'black')
                    .style('font-size', 8.5)
                    .attr("height", function(d) {return height_svg - yScale(d.Counts);});*/

                    // add the x axis
                    svg_in.append("g")
                      .attr("class", "axis")
                      .attr("transform", "translate(35," + height_svg + ")")
                      .call(d3.axisBottom(xScale))
                      .selectAll("text").remove();
                      /*.attr("y", 0)
                      .attr("x", 9)
                      .attr("dy", ".35em")
                      .attr("transform", "rotate(90)")
                      .style("text-anchor", "start");*/

                    // Change the Y coordinates of line and circle
                    //svg_in.selectAll(".bar")
                    //  .transition()
                    //  .duration(2000)
                    //  .attr("cy", function(d) {return yScale(d.Counts); })

                    // add the y axis
                    svg_in.append("g")
                      .attr("class", "axis")
                      .style('font-size', 8.5)
                      .attr("transform", "translate("+ 35 +",0)", )
                      .call(d3.axisLeft(yScale));
                   }

                   // text label for the y axis
                    svg_in.append("text")
                        .attr("transform", "rotate(-90)")
                        .attr("y",  - margin)
                        .attr("x",0 - (height_svg / 2))
                        .style('font-size', 12)
                        .attr("dy", "1em")
                        .style("text-anchor", "middle")
                        .text("Flow Counts");

                    // text label for the x axis
                    svg_in.append("text")
                        .attr("transform", "rotate(0)")
                        .attr("y",  10 + height_svg)
                        .attr("x",-30 + width_svg)
                        .style('font-size', 12)
                        .attr("dy", "1em")
                        .style("text-anchor", "middle")
                        .text("Stations");

                   // Make the plot
                  let barplot = draw_bar_chart_in()
            });
}

bar1(["Pier 69 / Alaskan Way & Clay St"])
