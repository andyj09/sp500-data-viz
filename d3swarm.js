
let data;
const starting_year = 2017;
const starting_quarter = "Q1";
const ending_year = 2021;
const ending_quarter = "Q4";
let selected_year = starting_year;
let selected_quarter = starting_quarter;
let simulation = null
let first_time = true;
let filtered_data = null;

const render = () => {
    const title = 'S&P 500 Growth since 2017';

    // Chart dimensions
    const width = 1920;
    const height = 1080;

    const margin = { top: 100, right: 120, bottom: 100, left: 120 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // The svg object
    const svg = d3.select('svg')
                  .style("display", "block")
                  .style("margin", "auto")
                  .attr("width", width)
                  .attr("height", height);
                  // .style("outline", "3px solid green")

    // Set the filtered data
    filtered_data = data.filter(d => d.Year == selected_year &&
                                     d.Quarter == selected_quarter);

    // Scales
    let sectors = Array.from(new Set(data.map((d) => d.Sector)));
    const xScale = d3.scaleBand()
      .domain(sectors)
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(filtered_data.map((d) => d.Return)))
      .range([innerHeight, 0])
      .nice();

    const color = d3.scaleOrdinal()
      .domain(sectors)
      .range(d3.schemePaired);

    const marketcapDomain = d3.extent(filtered_data.map((d) => d.MarketCap));
    const size = d3.scaleSqrt()
      .domain(marketcapDomain)
      .range([3, 40]);

    // Chart container
    const g = svg.selectAll('.container').data([null]);
    // Add the container for enter selection
    const gEnter = g
      .enter().append('g')
        .attr('class', 'container');
    // Transform the container for merge selection
    gEnter
      .merge(g)
        .attr('transform', `translate(${margin.left+50}, ${margin.top})`)

    // Legend
    let legendTitle =  gEnter.append("g")
      .selectAll("g")
      .data([null])
      .enter().append("text")
        .attr('x', innerWidth-margin.right-70)
        .attr('y', -80)
        .text("Market Cap")
        .attr('fill', 'black')
        .attr('class', 'legend-label')

    let legend_data = [
      {r: 20, x: 20,  y: -22, textYOffset: -2, text: "500B"},
      {r: 10, x: 70,  y: -12, textYOffset: 5,   text: "250B" },
      {r: 5,  x: 105, y: -7 , textYOffset: 10,   text: "50B"}
    ];

    var legend = gEnter.append("g")
      .selectAll("g")
      .data(legend_data)
      .enter().append("g")
    // legend circles
    legend.append("circle")
      .attr("cy", (d) => d.y)
      .attr("cx", (d,i) => innerWidth-margin.right+45-d.x)
      .attr("r", (d) => d.r)
      .attr('fill', 'none')
      .attr('stroke', '#8E8883')
      .attr('stroke-width', 3)
    // legend text
    legend.append("text")
      .attr('x', (d,i) => innerWidth-margin.right+45-d.x-(d.r+d.textYOffset))
      .attr('y', (d) => d.y-d.r-10)
      .text((d) => d.text)
      .attr('fill', 'black')
      .attr('class', 'legend-bubble-label');

    // x-axis
    const xAxis = d3.axisBottom(xScale)
      .tickSize(-innerHeight)
      .tickPadding(15);

    const xAxisG = g.select('.x-axis');
    const xAxisGEnter = gEnter
      .append('g')
        .attr('class', 'x-axis');
    xAxisG
      .merge(xAxisGEnter)
      .attr('transform', `translate(-${xScale.bandwidth()/2}, ${innerHeight})`)
      .call(xAxis)
      .selectAll(".tick text")
        .call(wrap, xScale.bandwidth())
      .selectAll('.domain').remove();

    // Remove unwanted lines
    svg.selectAll('.x-axis .domain').remove();
    // Axis label
    const xAxisLabelText = xAxisGEnter
      .append('text')
        .attr('class', 'axis-label')
        .attr('y', 95)
        .attr('fill', 'black')
      .merge(xAxisG.select('.axis-label'))
        .attr('x', innerWidth / 2)
        .text('Sector');

    // Format axis tick labels
    function wrap(text, width) {
      text.each(function() {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
        while (word = words.pop()) {
          line.push(word);
          tspan.text(line.join(" "));
          if (tspan.node().getComputedTextLength() > width) {
            line.pop();
            tspan.text(line.join(" "));
            line = [word];
            tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
          }
        }
      });
    }

    // y axis
    const yAxis = d3.axisLeft(yScale)
      .tickSize(-innerWidth);

    const yAxisG = g.select('.y-axis');
    const yAxisGEnter = gEnter
      .append('g')
        .attr('class', 'y-axis');
    yAxisG
      .merge(yAxisGEnter)
      .call(yAxis)
      .attr('transform', `translate(-${xScale.bandwidth()/2}, 0)`)
      // .attr('transform', `translate(0, 0)`)
      .selectAll('.domain').remove();

    const yAxisLabelText = yAxisGEnter
      .append('text')
        .attr('class', 'axis-label')
        .attr('y', -53)
        .attr('fill', 'black')
        .attr('transform', `rotate(-90)`)
        .attr('text-anchor', 'middle')
      .merge(yAxisG.select('.axis-label'))
        .attr('x', -innerHeight / 2)
        .text("Return %");

    // Set initial values for force variables
    filtered_data.forEach(d => {
      d.x = xScale(d.Sector);
      d.y = yScale(d.Return);
      d.vx = 0.0;
      d.vy = 0.0;
      d.radius = 0.0;
    });

    // Create the simulation on the first render
    if (first_time) {
      simulation = d3.forceSimulation(filtered_data)
        .randomSource(() => 0.9)
        .force("x", d3.forceX((d) => xScale(d.Sector)).strength(.4))
        .force("y", d3.forceY((d) => yScale(d.Return)).strength(.1))
        .force("collide", d3.forceCollide((d) => size(d.MarketCap)).strength(0.8))
        .alphaDecay(0.1)
        .on("tick", function(d) {
          simulation.nodes().forEach((x) => {
            let r = size(x.MarketCap);
            x.x = Math.max(margin.left-xScale.bandwidth()-15, Math.min(innerWidth-r-60, x.x));
            x.y = Math.max(margin.top+r, Math.min(innerHeight-r, x.y));
          });

          d3.selectAll('.circ')
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y );

          d3.selectAll('.ttip')
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y);

          d3.selectAll('.ticker-text')
            .attr("x", (d) => d.x)
            .attr("y", (d) => d.y);
        });
      first_time = false;
    }
    else
    {
      // Update simulation on subsequent renders
      simulation.nodes(filtered_data);
      simulation.force("x").initialize(filtered_data);
      simulation.force("y").initialize(filtered_data);
    }

    // console.log(`Rendering ${selected_year} ${selected_quarter}`);

    // Ticker cicles
    const circles = g.merge(gEnter)
    .selectAll('.circ').data(filtered_data, d => d.Ticker);
    // Remove selection
    circles.exit().remove();

    // Enter selection
    circles
    .enter().append('circle')
      .attr('class', 'circ')
      .attr('cx', (d) => xScale(d.Sector))
      .attr('cy', (d) => yScale(d.Return))
      .attr('r', (d) => size(d.MarketCap))
      .attr('fill', (d) => color(d.Sector))
      .attr('stroke', 'black')
    .merge(circles)
      .transition().duration(100)
        .attr('cx', (d) => xScale(d.Sector))
        .attr('cy', (d) => yScale(d.Return))
        .attr('r', (d) => size(d.MarketCap))
          .on('end', () => {
            simulation.nodes(filtered_data)
              .alphaDecay(0.5)
              .alpha(0.05)
              .restart()
          });

    // Add the tooltip
    // Define the div for the tooltip
    let div = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    const tooltips =  g.merge(gEnter)
      .selectAll(".ttip").data(filtered_data, d => d.Ticker);

    tooltips.exit().remove();
    tooltips
      .enter().append("circle")
        .attr("class", "ttip")
        .attr("r", (d) => size(d.MarketCap))
        .attr("cx", (d) => xScale(d.Sector))
        .attr('cy', (d) => yScale(d.Return))
        .attr('fill-opacity', "0.0")
        .on("mouseover", (event,d) => {
          div.transition()
              .duration(200)
              .style("opacity", .9);
          div .html(() => {
                const integerMcap = Math.trunc(d.MarketCap);
                let tt = "Ticker: " + d.Ticker + "<br/>" +
                         "Return: " + d.Return + "%" + "<br/> " +
                         "Market Cap: " + integerMcap + "B";
                return tt;
               })
              .style("left", (event.pageX + 10)+ "px")
              .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", (d) => {
          div.transition()
              .duration(500)
              .style("opacity", 0);
        });

      // Add ticker text for these tickers
      ticker_text = [
        "GE","JNJ", "WMT", "AMZN", "AAPL", "MSFT",
        "NEE", "JPM", "LIN", "AMT", "GOOGL",
        "CVX", "NVDA", "FB", "GOOG", "TSLA"
      ];
      // Create another filtered data set
      filtered_data2 = filtered_data.filter(d => ticker_text.includes(d.Ticker));

      // Text inside circles
      const textSel =  g.merge(gEnter)
        .selectAll('.ticker-text').data(filtered_data2, d => d.Ticker);

      textSel.enter().append("text")
        .text((d) => d.Ticker)
        .attr("class", "ticker-text")
        .attr("text-anchor", "middle")
        .attr("x", (d) => xScale(d.Sector))
        .attr("y", (d) => yScale(d.Return))
        .style("font-size", (d) => {
          let r = size(d.MarketCap);
          return r / ((r * 10) / 100);
        })
      .merge(textSel)
        .transition().duration(100)
          .attr("y", (d) => yScale(d.Return))
          .attr("x", (d) => xScale(d.Sector))
          .attr("font-size", (d) => {
            let r = size(d.MarketCap);
            return r / ((r * 10) / 100);
          })
};

// Load the csv data
d3.csv('data/history-data.csv')
  .then(loadedData => {
    data = loadedData;

    // Type casts
    data.forEach(d => {
      d.Year = +d.Year;
      d.Return = +d.Return;
      d.MarketCap = +d.MarketCap;
    });

    // console.log(`Start at ${selected_year} ${selected_quarter}`)
    // First render
    render();

});

// Simulation controls
let timerCounter = 0
const total_quarters = (ending_year - starting_year + 1) * 4
// console.log("total_quarters = " + total_quarters);

let stepBackInterval = null;
let playing = false;
function playpause()
{
  if(playing)
  {
    clearInterval(stepBackInterval);
    playing = false;
  }
  else
  {
    stepBackInterval = setInterval(runsim, 1000);
    playing = true;
  }
}

var slider = document.getElementById("myRange");
var output = document.getElementById("demo");

slider.min = 0;
slider.max = total_quarters-1;
slider.value = slider.min;
// console.log(`slider.min: ${slider.min}, max: ${slider.max}`);

output.innerHTML = `${selected_year} ${selected_quarter}`;

const goBack = (clicked=false) => {
  if (selected_year >= starting_year &&
     !(selected_year == starting_year && selected_quarter == starting_quarter))
  {
    switch(selected_quarter) {
      case "Q1":
        selected_quarter = "Q4";
        selected_year -= 1;
        break;
      case "Q2":
        selected_quarter = "Q1"
        break;
      case "Q3":
        selected_quarter = "Q2"
        break;
      case "Q4":
        selected_quarter = "Q3"
        break;
    }

    if (clicked) {
      slider.value = parseInt(slider.value) - 1;
      // console.log("new slider.value = " +slider.value);
     }

    // Render frame
    render();

    // console.log(`Going back to ${selected_year} ${selected_quarter}`);
    output.innerHTML = `${selected_year} ${selected_quarter}`;
  }
  else {
    // console.log(`Stuck at ${selected_year} ${selected_quarter}`);
    return;
  }

};

const goForward = (clicked=false) => {
  if (selected_year <= ending_year &&
    !(selected_year == ending_year && selected_quarter == ending_quarter))
  {
   switch(selected_quarter) {
     case "Q1":
       selected_quarter = "Q2";
       break;
     case "Q2":
       selected_quarter = "Q3"
       break;
     case "Q3":
       selected_quarter = "Q4"
       break;
     case "Q4":
       selected_quarter = "Q1"
       selected_year += 1;
       break;
   }

   if (clicked) {
    slider.value = parseInt(slider.value) + 1;
    // console.log("new slider.value = " +slider.value);
   }

  //  console.log(`Going forward to ${selected_year} ${selected_quarter}`);
   output.innerHTML = `${selected_year} ${selected_quarter}`;

   // Render frame
   render();
 }
  else {
    // console.log(`Stuck at ${selected_year} ${selected_quarter}`);
    return;
  }
}

function runsim()
{
  // console.log("runsim()");
  // Go forward
  if(parseInt(slider.value) < parseInt(slider.max))
  {
    // console.log(`slider.value < slider.max - ${slider.value} < ${slider.max}`);
    slider.value = parseInt(slider.value) + 1;
    // console.log("new slider.value = " +slider.value);
    goForward();
  }
  else if(parseInt(slider.value) == parseInt(slider.max))
  {
    // console.log("slider.value == slider.max");
    // Last frame has already been rendered. Reset sim and render.

    // reset slider
    selected_year = starting_year;
    selected_quarter = starting_quarter;
    slider.value = slider.min;
    output.innerHTML = `${selected_year} ${selected_quarter}`;
    // console.log("slider.value = " +slider.value);
    // console.log(`Resetting to ${selected_year} ${selected_quarter}`)

    // Render frame
    render();
  }
  else
  {
    // console.log("Something is wrong slider.value > slider.max.");
  }
}