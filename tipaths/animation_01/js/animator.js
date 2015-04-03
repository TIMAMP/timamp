define(["animator"], function($) {
    
    "use strict";
    
    var animator = {};
    
    // -----------------------------------------------------------------------------
    
    var redrawFn;
    var fps;
    var mspf;
    var animate = false;
    var redrawBusy = false;
    var prevFrameTime = 0;
    var pauseAfterOne = false;
    
    // -----------------------------------------------------------------------------
    
    /**
     * Animator constructor
     * @param {Function} redrawFn A function that is called for each frame. This
     *                            function is called with one argument, the complete
     *                            handler function, which should be called when the
     *                            update is complete.
     * @param {Number}   fps      Target frames per second.
     */
    animator.init = function(fps, _redrawFn) {
        redrawFn = _redrawFn;
        fps = fps;
        mspf = 1000 / fps;  // milliseconds per frame:
    }
    
    // -----------------------------------------------------------------------------
    
    animator.play = function () {
        if (animate) return;
        animate = true;
        requestAnimationFrame(animateFn);
    }
    
    animator.pause = function () {
        if (!animate) return;
        animate = false;
    }
    
    animator.playOneFrame = function () {
        pauseAfterOne = true;
        animator.play();
    }
    
    animator.paused = function () {
        return !animate;
    }
    
    // -----------------------------------------------------------------------------
    
    var animateFn = function () {
        if (!animate) { return; }
        var currTime = new Date().getTime();
        if (!redrawBusy && prevFrameTime + mspf <= currTime) {
            redrawBusy = true;
            prevFrameTime = currTime;
            redrawFn(function () {
                redrawBusy = false;
            });
        }
        if (animate) {
            if (pauseAfterOne) {
                animate = false;
                pauseAfterOne = false;
            }
            else {
                requestAnimationFrame(animateFn);
            }
        }
    };
    
    // -----------------------------------------------------------------------------
    
    // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
    // http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
    // requestAnimationFrame polyfill by Erik Möller, fixes from Paul Irish and Tino Zijdel
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() {
                    callback(currTime + timeToCall);
                },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }
    
    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }
    
    // -----------------------------------------------------------------------------
    
    return animator;
});