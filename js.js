let data =[];
let barData=[];
let dataPath = 'raw.csv';

d3.csv(dataPath)
    .then((d) => {
        //Select Airbnb reviewed from the last 5 years only
        d.map(obj => {
            let [day, month, year] = obj.last_review.split("/");
            let correctDateFormat = [year, month, day].join("/");
            return obj.last_review = correctDateFormat;
        });
        console.log(d);
        d = d.filter((d) => Date.parse(d.last_review) >= Date.parse("2017/01/01") && d.last_review !== "");
        console.log(d);
        filterRange(d);
        showMap(d);
        data = d;

        //Data for bar chart
        barData = d.sort(function(a, b) {
            return d3.descending(+a.number_of_reviews, +b.number_of_reviews);
        }).slice(0,10);
        if(barData.length == 0) {
            alert("Cannot find rooms, please reset your filters!")
        } else {
            console.log(barData);
        }
        buildBarChart(barData);
    });

//Give the Filter Range
function filterRange(data){
    let cityRange=[];
    let roomTypeRange = [];
    for(i =0;i< data.length;i++){
        cityRange.push(data[i].city);
        roomTypeRange.push(data[i].room_type);
    }
    //remove repeated item
    cityRange = [...new Set(cityRange)];
    roomTypeRange = [...new Set(roomTypeRange)];
    //send unique items to HTML
    for(j=0;j<cityRange.length;j++){
        document.getElementById("city").innerHTML += `<option>${cityRange[j]}</option>`
    }

    for(j=0;j<roomTypeRange.length;j++){
        document.getElementById("room").innerHTML += `<option>${roomTypeRange[j]}</option>`
    }
}

//Search Function
function search(){
    d3.selectAll('circle').remove();
    let city = document.getElementById("city").value;
    let room = document.getElementById("room").value;
    let lowPrice = document.getElementById("low_price").value;
    let highPrice = document.getElementById("high_price").value;
    let stayNights = document.getElementById("night").value;
    let hosts = document.getElementById("host").value;
    let updatedData = [];
    data.forEach((v,index) => {
        if ((city == 'All' || v.city.includes(city)) && 
        (room == 'All' || v.room_type.includes(room)) &&
        (stayNights == ''||v.minimum_nights <= stayNights) && ((hosts == '' )||v.calculated_host_listings_count >= hosts)&&
        (lowPrice == '' || v.price >= lowPrice ) && (highPrice == '' || v.price <= highPrice)
        ){
          updatedData.push(v)
        }   
    });

    //Select Top 10 in Numbers of Review (For Bar Chart)
    temp = updatedData.sort(function(a, b) {
        return d3.descending(+a.number_of_reviews, +b.number_of_reviews);
    }).slice(0,10);

    if(temp.length == 0) {
        alert("Cannot find rooms, please reset your filters!")
        return;
    } else if (temp.length < 10) {
        alert("Cannot find 10 rooms, please apply or reduce filters!")
        return;
    } else {
        console.log(temp);
    }

    if(barData !== temp && temp.length !== 0) {
        barData = temp;
        d3.select("#bar").select("svg").remove();
        buildBarChart(barData);
    }
    
    showMap(updatedData);
    return barData; 
}

//Show the map
function showMap(data){
    document.getElementById("result").innerHTML = "Result: "+ data.length;
    let YOUR_TOKEN = "pk.eyJ1IjoieWluaWlpIiwiYSI6ImNsMHFpOGR6czI3Nmcza3VvZWZ6anFoNjAifQ.OYj94Y9Y2MgLYR3_4mQoqg";
    mapboxgl.accessToken = YOUR_TOKEN;

    let mapBox = new mapboxgl.Map({
        container: "mapBox",
        style: "mapbox://styles/mapbox/streets-v9",
        center: [-95.7129, 37.09],
        zoom: 3
    })

    let container = mapBox.getCanvasContainer();
    let svg = d3.select(container)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "700")
        .style("position", "absolute")
        .style("z-index", 2);

    project = (d) => {
        return mapBox.project(new mapboxgl.LngLat(d.longitude, d.latitude));
    }

    let dots = svg.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("r", 4)
            //.style("fill", '#ff0000')
            //.style("opacity",'0.5')
            .attr("class", "circleStyle")
            .on("mouseenter", function(event,d){
                d3.select(this)
                .style("fill", "blue")
                .append("title")
                .attr("x" , event.x)
                .attr("y", event.y +20)
                .text(`Name: ${d.name}
City: ${d.city}
Room Type: ${d.room_type}
Price Per Night: ${d.price}
Minimum Nights:${d.minimum_nights}
Host Count:${d.calculated_host_listings_count}
Total Number Of Reviews: ${d.number_of_reviews}
Average Reviews Per Month: ${d.reviews_per_month}
Last Review: ${d.last_review}`)
            })
            .on("mouseout", function(event,d){
                d3.select(this)
                    .style("fill","#ff0000")
                    .style("opacity","0.5")
                    .style("border","1px solid #ff0000")
                d3.selectAll(".tooltip")
                    .remove()
            })  
            ;
                
        render = () => {
            dots
                .attr("cx", d => project(d).x)
                .attr("cy", d => project(d).y)
        }

        mapBox.on("Viewreset", render);
        mapBox.on("move", render);
        mapBox.on("moveend", render);
        render();

}

//Build bar chart
function buildBarChart(data){
    //Build Structure For Bar Chart
    const svgWidth = 600;
    const svgHeight = 800;
    const barWidth = 15;
    //Create SVG Element                 
    svg = d3.select("#bar")
        .append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
    //Create Y Axis
    let y_scale = d3.scaleLinear()
        .domain([1000,0])       //The maximum number of reviews is 966 in the file
        .range([50, svgHeight-300]);
    
    svg.append("g").attr("transform", "translate(75,0)").call(d3.axisLeft(y_scale));
    //Create X Axis
    let x_scale = d3.scaleBand()
        .domain(data.map((d) => d.name))
        .range([75, svgWidth-20])
        .padding(0.5)
    
    svg.append("g")
        .attr("transform", `translate(0,500)`)
        .call(d3.axisBottom(x_scale))
        .selectAll("text")
        .attr("transform", "translate(-10,0) rotate(-65)")   //Rotate the text so they can be read
        .style("text-anchor", "end");
    //Create Bars
    svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .style("fill", "orange")
        .attr("x", (d,i) => i*48 + 105)
        .attr("y", d => 500 - d.number_of_reviews * 0.445)
        .attr("width", barWidth)
        .attr("height", d => d.number_of_reviews * 0.445)
        .on("mouseenter", function(event,d){
            d3.select(this)
            .style("fill", "yellow")
            .append("title")
            .attr("class", "tooltip")
            .attr("x" , event.x)
            .attr("y", event.y +20)
            .text(`Name: ${d.name}
City: ${d.city}
Room Type: ${d.room_type}
Price Per Night: ${d.price}
Total Number Of Reviews: ${d.number_of_reviews}
Average Reviews Per Month: ${d.reviews_per_month}
Last Review: ${d.last_review}`)
        })
        .on("mouseout", function(event,d){
            d3.select(this)
                .style("fill", "orange");
            d3.selectAll(".tooltip")
                .remove()
        })
}

