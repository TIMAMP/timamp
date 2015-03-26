#Pre-processing

##TIPaths prepro-file 01

The generated JSON file is formatted as follows. The items `<density>`, `<speed_u>`, `<speed_v>`, `<ground_speed>` are floatingpoint values. The nature of these values are described next.

```
{
    "metadata" : {
        "startTime": "2013-04-05T17:40:12Z",
        "windowDuration" : 25,
        "deltaStartTime" : 5,
        "radars" : [ radarId, ... ],
        "altitudes" : [ 0.3, 0.5, ... ],
        "dataIndices" : [ "density", "speed_u", "speed_v" ]
    },
    data : [ /* for each window */
        [ /* for each radar */
            [ /* for each altitude */
                [ <density>, <speed_u>, <speed_v> ],
                ...
            ],
            ...
        ],
        ...
    ],
    ...
}
        
```

####`<density>`

This value is the average of the densities of all observations for the given radar, within the given window, for the given altitude, for which the `radial_velocity_std` is at least 2, where:
- a *window* is a periode that starts at the `startTime` given in the metadata and has a duration of `windowDuration` minutes.
- *within the given window* means that the `start_time` of the observation is larger than or equal to the start-time of the window and smaller than the end-time of the window.
