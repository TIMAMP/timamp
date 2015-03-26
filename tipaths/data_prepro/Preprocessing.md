#Pre-processing

##TIPaths prepro-file 01

The generated JSON file is formatted as follows. The items `<density>`, `<speed_u>`, `<speed_v>`, `<ground_speed>` are floatingpoint values. The nature of these values are described next.

```
{
    metadata : {
        startTime: '2013-04-05T17:40:12Z',
        windowDuration : 25,
        deltaStartTime : 5,
        radars : [ radarId, ... ],
        altitudes : [ 0.3, 0.5, ..., 3.9 ],
        dataIndices : [ 'density', 'speed_u', 'speed_v', 'ground_speed' ]
    },
    data : [ /* for each window */
        [ /* for each radar */
            [ /* for each altitude */
                [ <density>, <speed_u>, <speed_v>, <ground_speed> ],
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

This value is the average of the densities of all observations for the given radar, within the given window, for the given altitude, for which the `radial_velocity_std` is at least 2.
Within the given window means
