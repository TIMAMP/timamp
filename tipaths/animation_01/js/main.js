/*jshint unused: false, latedef: false */
/*jslint vars: true, plusplus: true, undef: true, continue: true */
/*global requirejs, require */

requirejs.config({
    baseUrl: 'js',
    shim: {
        'proj4': { exports: 'proj4' },
        'kriging': { exports: 'kriging' },
        'stats': { exports: 'Stats' }
    },
    paths: {
        jquery: 'lib/jquery',
        proj4: 'lib/proj4',
        stats: 'lib/stats.min',
        moment: 'lib/moment' /* http://momentjs.com/docs/ */
    }
});

require(["jquery", "data", "Map", "util", "moment", "animator", "stats"],
        function ($, data, Map, util, moment, animator, Stats)
{   
    "use strict";
    
    var animStartTime = new Date(2013, 3, 6, 12, 0, 0);
    var animEndTime = new Date(2013, 3, 11, 12, 5, 0);
    var flowDuration = 120; // minutes
    var framesPerWindow = 4;
    var fps = 12;
    var altitudes = [0.3, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.7, 1.9, 2.1, 2.3, 2.5, 2.7, 2.9, 3.1, 3.3, 3.5, 3.7, 3.9];
    var maxDensity = 2880;
    var altiHueMin = 0.5;
    var altiHueMax = 1;
    var altiSaturation = 0.8;
    var altiBrightness = 0.8;
    var maxPathCnt = 2.5;
    var ras = [];   // random angles for flowline positions
    var rds = [];   // random distances for flowline positions
    var mapImg;     // the basemap image
    var map;
    var canvas;
    var r100, r50;
    var stats;
    var mspf = 1000 / fps;  // milliseconds per frame:
    
    function init() {
        var alti, altn = altitudes.length,
            i, raset, rdset;
        canvas = $("#canvas");
        
        $("#duration").text(flowDuration / 60);
        drawLegend();
        
        map = new Map(700);
        //console.log("- map.width: " + map.width);
        canvas.attr({
            width: map.width,
            height: map.height
        });
        r100 = map.dmxToPxl(100000); // 100 km
        r50 = map.dmxToPxl(50000); // 50 km
        
        for (alti = 0; alti < altn; alti++) {
            raset = [];
            rdset = [];
            for (var i = 0; i < 100; i++) {
                raset.push(Math.random() * Math.PI * 2);
                rdset.push(Math.random() * r100);
            }
            ras.push(raset);
            rds.push(rdset);
        }
        
        stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.left = '10px';
        stats.domElement.style.bottom = '10px';
        //document.body.appendChild(stats.domElement);
        
        // Load the map image:
        mapImg = new Image();
        mapImg.onload = function() {
            $.getJSON("data/rdata.json", function (rdata) {
                rdata.startTime = new Date(rdata.startTime);
                if (framesPerWindow > 1) {
                    expandData(rdata);
                }
                drawLoop(rdata);
            });
        }
        mapImg.src = "../images/basemap_01.png";
        
        //data.printSpecifics();
    }
    
    function expandData(rdata) {
        var wini;
        var stepi, stepn = framesPerWindow;
        var alti, altn = rdata.altitudes.length;
        var radi, radn = rdata.radars.length;
        var usa, usb = rdata.uSpeeds[0], uso, usi;
        var vsa, vsb = rdata.vSpeeds[0], vso, vsi;
        var dea, deb = rdata.densities[0], deo, dei;
        var wea, web;
        
        for (wini = 1; wini < rdata.windowCount; wini++) {
            usa = usb;
            usb = rdata.uSpeeds[wini];
            vsa = vsb;
            vsb = rdata.vSpeeds[wini];
            dea = deb;
            deb = rdata.densities[wini];
            
            for (stepi = 1; stepi < stepn; stepi++) {
                uso = [];
                vso = [];
                deo = [];
                wea = (stepn - stepi) / stepn;
                web = stepi / stepn;
                //console.log("wea: " +  wea + ", web: " + web);
                
                for (alti = 0; alti < altn; alti++) {
                    usi = [];
                    vsi = [];
                    dei = [];
                    for (radi = 0; radi < radn; radi++) {
                        usi.push(wea * usa[alti][radi] + web * usb[alti][radi]);
                        vsi.push(wea * vsa[alti][radi] + web * vsb[alti][radi]);
                        dei.push(wea * dea[alti][radi] + web * deb[alti][radi]);
                    }
                    uso.push(usi);
                    vso.push(vsi);
                    deo.push(dei);
                }
                wini++;
                rdata.windowCount++;
                rdata.uSpeeds.splice(wini, 0, uso);
                rdata.vSpeeds.splice(wini, 0, vso);
                rdata.densities.splice(wini, 0, deo);
            }
        }
    }
    
    // -----------------------------------------------------------------------------
    
    function drawLoop(rdata) {
        
        // frames per flow:
        var frpfl = flowDuration / rdata.windowDuration * framesPerWindow;
        //console.log("frpfl: " + frpfl);
        
        // milliseconds per window shift:
        var msps = rdata.windowDuration / framesPerWindow * 60000;
        //console.log("msps: " + msps);
        
        var dataStartTime = rdata.startTime.getTime();
        var friStart = (animStartTime.getTime() - dataStartTime) / msps;
        var friEnd = (animEndTime.getTime() - dataStartTime) / msps;
        var fri = friStart;
        var nextFri = -1;
        //console.log("friStart: " + friStart + " - friEnd: " + friEnd);
        
        if (fri + frpfl > rdata.windowCount) {
            console.error("fri (" + fri + ") + friEnd (" + friEnd
                          + ") > rdata.windowCount (" + rdata.windowCount + ")");
            return;
        }
        
        function updateFri(mouseX) {
            var tmp = util.constrain(mouseX - 2, 0, 186);
            nextFri = Math.round(util.map(tmp, 0, 186, friStart, friEnd));
            if (animator.paused()) { animator.playOneFrame(); }
        }
        
        $(".playerDiv").click(function (ev) {
            updateFri(ev.pageX - this.offsetLeft);
        });
        $(".playerDiv").mousedown(function (ev) {
            updateFri(ev.pageX - this.offsetLeft);
            $(".playerDiv").mousemove(function (ev) {
                updateFri(ev.pageX - this.offsetLeft);
            });
        });
        $(".playerDiv").mouseup(function () {
            $(".playerDiv").unbind('mousemove');
        });
        $("#pauseBtn").click(function () {
            animator.pause();
        });
        $("#playBtn").click(function () {
            animator.play();
        });
        
        var flowFrom = new Date();
        var ctx = canvas[0].getContext("2d");
        
        animator.init(fps, function (completeHandler) {
            if (nextFri > -1) {
                fri = nextFri;
                nextFri = -1;
            }
            
            flowFrom.setTime(dataStartTime + fri * msps);
            
            // The current time in minutes from midnight (24h = 1440 min):
            var min = flowFrom.getHours() * 60 + flowFrom.getMinutes();
            
            //console.log("flowFrom: " + flowFrom);
            $("#input_days").text(flowFrom.getDate());
            $("#input_hours").text(flowFrom.getHours());
            $("#input_minutes").text(flowFrom.getMinutes());
            
            updateAvDensities(rdata, fri, frpfl / 2);
            drawMap(rdata, ctx);
            drawDate(flowFrom, 15, 15, 90, 25, ctx);
            drawClock(flowFrom, 60, 100, 45, ctx);
            drawSunClock(min, 60, 205, 45, ctx);
            
            // updatePlayHead(fri, friStart, friEnd);
            $(".playHead").width(util.map(fri, friStart, friEnd, 1, 188));
            
            drawPaths(rdata, fri, frpfl, ctx);
            
            if (++fri >= friEnd) {
                animator.pause();
                fri = friStart;
            }
            completeHandler();
        });
        animator.playOneFrame();
    }
    
    function updateAvDensities(rdata, win0, wind) {
        var alti, altn = rdata.altitudes.length,
            radi, radn = rdata.radars.length,
            wini, winn = win0 + wind,
            ads, sum;
        
        for (alti = 0; alti < altn; alti++) {
            ads = rdata.avDensities[alti];
            for (radi = 0; radi < radn; radi++) {
                sum = 0;
                for (wini = win0 - wind; wini < winn; wini++) {
                    sum += rdata.densities[wini][alti][radi];
                }
                ads[radi] = sum / radn;
            }
        }
    }
    
    // -----------------------------------------------------------------------------
    
    /**
     * Draw the map.
     * @param {Object} rdata The object that contains the data.
     * @param {Object} ctx   CanvasRenderingContext2D
     */
    function drawMap(rdata, ctx) {
        var radi, radn = rdata.radars.length,
            radx, rady,
            clr = "120, 146, 164";
        
        // Draw the map bitmap:
        ctx.drawImage(mapImg, 0, 0);

        // Draw radars and interpolation:
        for (radi = 0; radi < radn; radi++) {
            radx = rdata.xPositions[radi];
            rady = rdata.yPositions[radi];

            // Draw radar shapes:
            ctx.strokeStyle = "rgba(" + clr + ", 0.4)";

            // radar center:
            ctx.beginPath();
            ctx.fillStyle = "rgb(" + clr + ")";
            ctx.arc(radx, rady, 2, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
    
    // -----------------------------------------------------------------------------
    
    /**
     * Draw the paths.
     * @param {Object}   rdata The data object.
     * @param {[[Type]]} win0  The index of the first window.
     * @param {[[Type]]} wind  The number of windows in a window.
     * @param {Object}   ctx   CanvasRenderingContext2D
     */
    function drawPaths(rdata, win0, wind, ctx) {
        //console.log(">> drawPaths - win0 " + win0 + ", wind: " + wind);
        var wini, winn,
            alti, altn = rdata.altitudes.length,
            radi, radn = rdata.radars.length,
            pathi, pathn,
            densities, uSpeeds, vSpeeds,
            hue,
            radx, rady,
            pa = 0, pd, px, py, px0, py0, dx, dy,
            xps = rdata.xPositions,
            yps = rdata.yPositions,
            idw = util.idw,
            asat = altiSaturation,
            abri = altiBrightness,
            alpha;
        
        ctx.lineWidth = 1.5;
        
        // pixels secs per meter, als volgt te gebruiken:
        // d[pxl] = speed[m/s] * (duration[s] * conv[pxl/m])
        var pspm = map.dmxToPxl(1) * rdata.windowDuration * 60 / framesPerWindow;
        
        // the volume of the context in km3, i.e. area of circle with 100km
        // radius by 200m:
        var contextVolume = Math.PI * 100 * 100 / 5;
        
        // for each altitude:
        for (alti = 0; alti < altn; alti++) {
            densities = rdata.avDensities[alti];
            hue = util.map(alti, 0, altn, altiHueMin, altiHueMax);
            
            // for each radar:
            for (radi = 0; radi < radn; radi++) {
                radx = rdata.xPositions[radi];
                rady = rdata.yPositions[radi];
                
                // for each path:
                pathn = util.map(densities[radi], 0, maxDensity, 0, maxPathCnt);
                //console.log(densities[radi] + " - " + pathn);
                for (pathi = 0; pathi < pathn; pathi++) {
                    pa = ras[alti][pathi];
                    pd = rds[alti][pathi];
                    px0 = px = radx + Math.cos(pa) * pd;
                    py0 = py = rady + Math.sin(pa) * pd;
                    winn = win0 - wind;
                    for (wini = win0 - 1; wini >= winn; wini--) {
                        //console.log("wini: " + wini + " - alti: " + alti);
                        if (rdata.uSpeeds[wini] === undefined) { // DEBUG
                            console.error("rdata.uSpeeds[wini] is undefined for"
                                          + " wini: " + wini + ", alti: " + alti);
                        }
                        uSpeeds = rdata.uSpeeds[wini][alti];
                        vSpeeds = rdata.vSpeeds[wini][alti];
                        dx = idw(px, py, uSpeeds, xps, yps, 2) * pspm;
                        dy = idw(px, py, vSpeeds, xps, yps, 2) * pspm;
                        alpha = util.map(wini, win0 - 1, winn, 0.9, 0.7);
                        ctx.strokeStyle = util.hsvaToRgba(hue, asat, abri, alpha);
                        ctx.beginPath();
                        ctx.moveTo(px, py);
                        px -= dx;
                        py += dy;
                        ctx.lineTo(px, py);
                        ctx.stroke();
                    }
                    winn = win0 + wind;
                    px = px0;
                    py = py0;
                    for (wini = win0; wini < winn; wini++) {
                        //console.log("wini: " + wini + " - alti: " + alti);
                        if (rdata.uSpeeds[wini] === undefined) { // DEBUG
                            console.error("rdata.uSpeeds[wini] is undefined for"
                                          + " wini: " + wini + ", alti: " + alti);
                        }
                        uSpeeds = rdata.uSpeeds[wini][alti];
                        vSpeeds = rdata.vSpeeds[wini][alti];
                        dx = idw(px, py, uSpeeds, xps, yps, 2) * pspm;
                        dy = idw(px, py, vSpeeds, xps, yps, 2) * pspm;
//                        alpha = util.map(wini, 0, winn - 1, 0.6, 0.9);
                        ctx.strokeStyle = util.hsvaToRgba(hue, asat, abri, 0.9);
                        ctx.beginPath();
                        ctx.moveTo(px, py);
                        px += dx;
                        py -= dy;
                        ctx.lineTo(px, py);
                        ctx.stroke();
                    }

                    //ctx.fillStyle = "rbga(0, 0, 0, .5)";
                    ctx.fillStyle = util.hsvaToRgba(hue, 0.8, 0.6, 0.5);
                    ctx.beginPath();
                    ctx.arc(px, py, 1.5, 0, 2 * Math.PI);
                    ctx.fill();
                }
            }
        }
    }
    
    // -----------------------------------------------------------------------------
    
    /**
     * Draw the date.
     * @param {Date}   flowFrom The date.
     * @param {Number} tlx      top left x
     * @param {Number} tly      top left y
     * @param {Number} wid      width
     * @param {Number} hei      height
     * @param {Object} ctx      CanvasRenderingContext2D
     */
    function drawDate(flowFrom, tlx, tly, wid, hei, ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.moveTo(tlx + 5, tly);
        ctx.lineTo(tlx + wid - 5, tly);
        ctx.arcTo(tlx + wid, tly, tlx + wid, tly + 5, 5);
        ctx.lineTo(tlx + wid, tly + hei - 5);
        ctx.arcTo(tlx + wid, tly + hei, tlx + wid - 5, tly + hei, 5);
        ctx.lineTo(tlx + 5, tly + hei);
        ctx.arcTo(tlx, tly + hei, tlx, tly + hei - 5, 5);
        ctx.lineTo(tlx, tly + 5);
        ctx.arcTo(tlx, tly, tlx + 5, tly, 5);
        ctx.fill();
        
        // x-pos of the first vertical separator, as a the fraction of the width:
        var saf = 0.45;
        
        // x-pos of the second vertical separator, as a the fraction of the width:
        var sbf = 0.72;
        
        var tyx = 
        
        // vertical separators:
        ctx.strokeStyle = "#999999";
        ctx.lineWidth = .5;
        ctx.beginPath();
        ctx.moveTo(tlx + saf * wid, tly);
        ctx.lineTo(tlx + saf * wid, tly + hei);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tlx + sbf * wid, tly);
        ctx.lineTo(tlx + sbf * wid, tly + hei);
        ctx.stroke();
        
        ctx.font = "bold 15px Helvetica Neue";
        ctx.fillStyle = "#333333";
        ctx.textAlign = "center";
        ctx.textBaseline="middle";
        var flm = moment(flowFrom);
        ctx.fillText(flm.format("MMM").toUpperCase(),
                     tlx + wid * saf / 2, tly + hei  / 2);
        ctx.fillText(flm.format("D").toUpperCase(),
                     tlx + wid * (saf + (sbf - saf) / 2), tly + hei / 2);
        ctx.fillText(flm.format("YY").toUpperCase(),
                     tlx + wid * (sbf + (1 - sbf) / 2), tly + hei / 2);
        
        // horizontal line:
        ctx.strokeStyle = "#DDDDDD";
        ctx.lineWidth = .5;
        ctx.beginPath();
        ctx.moveTo(tlx, tly + hei / 2);
        ctx.lineTo(tlx + wid, tly + hei / 2);
        ctx.stroke();
    }
    
    // -----------------------------------------------------------------------------
    
    /**
     * [[Description]]
     * @param {[[Type]]} time [[Description]]
     * @param {[[Type]]} mx   [[Description]]
     * @param {[[Type]]} my   [[Description]]
     * @param {[[Type]]} radi [[Description]]
     * @param {Object}   ctx  CanvasRenderingContext2D
     */
    function drawClock(time, mx, my, radi, ctx) {
        var hour, min, ang, dx, dy;
        
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(mx, my, radi * 1.05, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
        ctx.lineCap="butt";
        for (hour = 0; hour < 12; hour++) {
            ang = util.map(hour, 0, 6, 0, Math.PI);
            dx = Math.cos(ang) * radi;
            dy = Math.sin(ang) * radi;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(mx + dx * 0.85, my + dy * 0.85);
            ctx.lineTo(mx + dx, my + dy);
            ctx.stroke();
        }
        
        ctx.lineCap="round";
        min = (time.getHours() % 12 * 60 + time.getMinutes()) - 180;
        ang = util.map(min, 0, 360, 0, Math.PI);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(ang) * radi * 0.5, my + Math.sin(ang) * radi * 0.6);
        ctx.stroke();
        
        ang = util.map(time.getMinutes(), 15, 45, 0, Math.PI);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(ang) * radi * 0.75, my + Math.sin(ang) * radi * 0.8);
        ctx.stroke();
    }
    
    // -----------------------------------------------------------------------------
    
    var sunrise = 420;  // 07h00, in minutes since midnight
    var sunset = 1215;  // 20h15, in minutes since midnight
    var ssm = 45;       // the time between start of twilight and sunrise
    var skh = 0.553;    // sky hue
    var grh = 0.264;    // ground hue
    var briMin = 0.2;   // nighttime brightness
    var briMax = 0.9;   // daytime brightness
    
    /**
     * [[Description]]
     * @param {[[Type]]} min  The current time in minutes from midnight.
     * @param {[[Type]]} mx   [[Description]]
     * @param {[[Type]]} my   [[Description]]
     * @param {[[Type]]} radi [[Description]]
     * @param {Object}   ctx  CanvasRenderingContext2D
     */
    function drawSunClock(min, mx, my, radi, ctx) {
        // sunrise --> angle: -180 deg
        // sunset  --> angle: 0 deg
        var ang = util.map(min, sunrise, sunset, -Math.PI, 0);
        
        var skb = sunFactor(min, briMin, briMax);
        
        // draw sky:
        ctx.fillStyle = util.hsvaToRgba(skh, 0.8, skb, 1);
        ctx.beginPath();
        ctx.arc(mx, my, radi * 1, -Math.PI, 0);
        ctx.fill();
        
        // draw sun:
        ctx.fillStyle = util.hsvaToRgba(0.155, 0.8, 0.9, 1);
        ctx.beginPath();
        ctx.arc(mx + Math.cos(ang) * radi * 0.7,
                my + Math.sin(ang) * radi * 0.7,
                radi * 0.15, 0, 2 * Math.PI);
        ctx.fill();
        
        // draw moon:
//        ctx.fillStyle = "#999";
//        ctx.beginPath();
//        ctx.arc(mx - Math.cos(ang) * radi * 0.5,
//                my - Math.sin(ang) * radi * 0.5,
//                radi * 0.15, 0, 2 * Math.PI);
//        ctx.fill();
        
        // draw ground:
        ctx.fillStyle = util.hsvaToRgba(grh, 0.8, skb, 1);
        ctx.beginPath();
        ctx.arc(mx, my, radi * 1, 0, Math.PI);
        ctx.fill();
    }
    
    // -----------------------------------------------------------------------------
    
    function drawLegend() {
        var alti, altn = altitudes.length,
            lac = $(".legend_altiColor"),
            hue, clr;
        
        for (alti = 0; alti < altn; alti++) {
            hue = util.map(alti, 0, altn, altiHueMin, altiHueMax);
            clr = util.hsvToHex(hue, altiSaturation, altiBrightness);
            lac.append("<div class='legend_altiColor_segment'"
                       + " style='background: " + clr + "'></div>");
        }
    }
    
    // -----------------------------------------------------------------------------
    
    function sunFactor(min, nightFct, dayFct) {
        if (nightFct === undefined) nightFct = 0;
        if (dayFct === undefined) dayFct = 1;
        var fct = nightFct;
        if (min >= sunrise - ssm && min <= sunrise + ssm) {
            fct = util.map(min, sunrise - ssm, sunrise + ssm, nightFct, dayFct);
        }
        else if (min > sunrise + ssm && min < sunset - ssm) {
            fct = dayFct;
        }
        else if (min >= sunset - ssm && min <= sunset + ssm) {
            fct = util.map(min, sunset - ssm, sunset + ssm, dayFct, nightFct);
        }
        return fct;
    }
    
    // -----------------------------------------------------------------------------
    
    init();
});
