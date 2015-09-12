/* jshint
browser:true,
jquery:true,
devel:true
*/
/* global d3:false, topojson:false */


var topo = {
    eu: {
        src: "eu.topo.json",
        object: "europe",
        center: [5, 51.5]
    },
    us: {
        src: "us.topo.json",
        object: "land",
        center: [ -73.02, 42.48]
    }
};
var activeTopo = topo.us;

var map,
    svg,
    path,
    topoJSONobj,
    mapW = window.innerWidth || document.documentElement.clientWidth,
    mapH = window.innerHeight || document.documentElement.clientHeight,
    scale = 800,
    offset = [mapW / 2, mapH / 2];


init();

function init(){
    //redraw on resize
    window.onresize = redrawMap;

    //redraw on scroll (+ adjust scale)
    $(window).bind('mousewheel', function(event) {
        scale *= (event.originalEvent.wheelDelta >= 0)? 1.2 : 0.8;
        redrawMap();
    });
    
    /* creating the SVG */
    svg = d3.select("#svg").append("svg")
        .attr("width", mapW)
        .attr("height", mapH)
        .style("border", "1px solid black");

    /* loading the topojson data */
    d3.json(activeTopo.src, function(error, data) {
        topoJSONobj = data;
        if (error) return console.error(error);
        console.log(topoJSONobj);

        window.topoJSONobj = topoJSONobj;
        window.center = activeTopo.center;

        var projection = d3.geo.mercator()
            .scale(scale)
            .center(activeTopo.center)
            .translate(offset);

        path = d3.geo.path().projection(projection);

        svg.append("path")
            .datum(topojson.feature(
                topoJSONobj,
                topoJSONobj.objects[activeTopo.object]
            ))
            .attr("d", path);


    });
}

function redrawMap() {
    console.log("redraw");
    var projection = d3.geo.mercator()
        .scale(scale)
        .center(activeTopo.center)
        .translate(offset);
    
    path = d3.geo.path().projection(projection);
    svg.remove();
    
    svg = d3.select("#svg").append("svg")
        .attr("width", mapW)
        .attr("height", mapH)
        .style("border", "1px solid black");
    
    svg.append("path")
            .datum(topojson.feature(
                topoJSONobj,
                topoJSONobj.objects[activeTopo.object]
            ))
            .attr("d", path);
}

$("#svg")
    .mousedown(function(e){
        $(this).data("p0",{ x: e.pageX, y: e.pageY });
        $(this).on("mousemove",function(e){
            var p1 = { x: e.pageX, y: e.pageY },
                p0 = $(this).data("p0") || p1,
                deltaX = p1.x-p0.x,
                deltaY = p1.y-p0.y;
            offset[0] += deltaX;
            offset[1] += deltaY;
            //console.log("dragging from x:" + p0.x + " y:" + p0.y + "to x:" + p1.x + " y:" + p1.y);
            redrawMap();
            
            $(this).data("p0", p1);
        });
    })
    .mouseup(function(){$(this).off("mousemove");})
    .mouseleave(function(){$(this).off("mousemove");})
    .mouseout(function(){$(this).off("mousemove");});