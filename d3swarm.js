const svg = d3.select('svg')
              .style("display", "block")
              .style("margin", "auto");

const width = +svg.attr('width');
const height = +svg.attr('height');
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

    const margin = { top: 50, right: 120, bottom: 50, left: 120 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Set the filtered data
    filtered_data = data.filter(d => d.Year == selected_year && d.Quarter == selected_quarter);

    let sectors = Array.from(new Set(data.map((d) => d.Sector)));
    const xScale = d3.scaleBand()
      .domain(sectors)
      .range([0, innerWidth]);

    // const innerHeightScaled = ;
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

    // Chart group
    const g = svg.selectAll('.container').data([null]);
    const gEnter = g
      .enter().append('g')
        .attr('class', 'container');

    gEnter
      .merge(g)
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // x axis
    const xAxis = d3.axisBottom(xScale)
      .tickSize(-innerHeight)
      .tickPadding(15);

    const xAxisG = g.select('.x-axis');
    const xAxisGEnter = gEnter
      .append('g')
        .attr('class', 'x-axis')
    xAxisG
      .merge(xAxisGEnter)
      .attr('transform', `translate(-${xScale.bandwidth()/2}, ${innerHeight})`)
      .call(xAxis)

    const xAxisLabelText = xAxisGEnter
      .append('text')
        .attr('class', 'axis-label')
        .attr('y', 45)
        .attr('fill', 'black')
      .merge(xAxisG.select('.axis-label'))
        .attr('x', innerWidth / 2)
        .text('Sectors');

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
      .selectAll('.domain').remove();

    filtered_data.forEach(d => {
      d.x = xScale(d.Sector);
      d.y = yScale(d.Return);
      d.vx = 0.0;
      d.vy = 0.0;
      d.radius = 0.0;
    });

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
      simulation.nodes(filtered_data);
      simulation.force("x").initialize(filtered_data);
      simulation.force("y").initialize(filtered_data);
    }

    console.log(`Rendering ${selected_year} ${selected_quarter}`);

    // Add the circles
    const circles = g.merge(gEnter)
    .selectAll('.circ').data(filtered_data, d => d.Ticker);

    circles.exit().remove();

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
          div .html(d.Ticker + "<br/>"  + d.Return + "%")
              .style("left", (event.pageX + 10)+ "px")
              .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", (d) => {
          div.transition()
              .duration(500)
              .style("opacity", 0);
        });

      // Add the text
      ticker_text = [
        "GE","JNJ", "WMT", "AMZN", "AAPL", "MSFT",
        "NEE", "JPM", "LIN", "AMT", "GOOGL",
        "CVX", "NVDA", "FB", "GOOG", "TSLA"
      ];
      filtered_data2 = filtered_data.filter(d => ticker_text.includes(d.Ticker));

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

// d3.csv('static/history-data-sample.csv')
d3.csv('data/history-data.csv')
  .then(loadedData => {
    data = loadedData;

    data.forEach(d => {
      d.Year = +d.Year;
      d.Return = +d.Return;
      d.MarketCap = +d.MarketCap;
    });

    console.log(`Start at ${selected_year} ${selected_quarter}`)
    render();

});

let timerCounter = 0
const total_quarters = (ending_year - starting_year + 1) * 4
console.log("total_quarters = " + total_quarters);

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
console.log(`slider.min: ${slider.min}, max: ${slider.max}`);

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
      console.log("new slider.value = " +slider.value);
     }

    render();

    console.log(`Going back to ${selected_year} ${selected_quarter}`);
    output.innerHTML = `${selected_year} ${selected_quarter}`;
  }
  else {
    console.log(`Stuck at ${selected_year} ${selected_quarter}`);
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
    console.log("new slider.value = " +slider.value);
   }

   console.log(`Going forward to ${selected_year} ${selected_quarter}`);
   output.innerHTML = `${selected_year} ${selected_quarter}`;

   render();
 }
  else {
    console.log(`Stuck at ${selected_year} ${selected_quarter}`);
    return;
  }
}

function runsim()
{
  console.log("runsim()");
  // Go forward
  if(parseInt(slider.value) < parseInt(slider.max))
  {
    console.log(`slider.value < slider.max - ${slider.value} < ${slider.max}`);
    slider.value = parseInt(slider.value) + 1;
    console.log("new slider.value = " +slider.value);
    goForward();
  }
  else if(parseInt(slider.value) == parseInt(slider.max))
  {
    console.log("slider.value == slider.max");
    // Last frame has already been rendered. Reset sim and render.

    // reset slider
    selected_year = starting_year;
    selected_quarter = starting_quarter;
    slider.value = slider.min;
    output.innerHTML = `${selected_year} ${selected_quarter}`;
    console.log("slider.value = " +slider.value);
    console.log(`Resetting to ${selected_year} ${selected_quarter}`)

    // Render
    render();
  }
  else
  {
    console.log("Something is wrong slider.value > slider.max.");
  }
}