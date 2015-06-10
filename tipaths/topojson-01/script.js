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
        object: "land" //"states"
    }
};
var activeTopo = topo.eu;

var map,
    svg,
    path,
    topoJSONobj,
    mapW = window.innerWidth || document.documentElement.clientWidth,
    mapH = window.innerHeight || document.documentElement.clientHeight,
    scale = 800;


init();

function init(){
    //redraw on resize
    window.onresize = redrawMap;

    //redraw on scroll (+ adjust scale)
    $(window).bind('mousewheel', function(event) {
        scale *= (event.originalEvent.wheelDelta >= 0)? 1.1 : 0.9;
        redrawMap();
    });
    
    /* creating the SVG */
    svg = d3.select("body").append("svg")
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
        var offset = [mapW / 2, mapH / 2];

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
        .translate([mapW / 2, mapH / 2]);
    
    path = d3.geo.path().projection(projection);
    svg.remove();
    
    svg = d3.select("body").append("svg")
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




