#Pre-processing

##TIPaths prepro-file 01

The generated JSON file is formatted as follows. The items `<density>`, `<speed_u>`, `<speed_v>`, `<ground_speed>` are floatingpoint values. The nature of these values are described next. Don't forget to remove the comments as they no part of the JSON syntax.

```
{
    "startTime" : "2013-04-05T17:40:12Z",
    "windowDuration" : 25,
    "deltaStartTime" : 5,
    "radars" : [ rid1, rid2, rid3, rid4, rid5 ],
    "altitudes" : [ 0.3, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.7, 1.9, 2.1, 2.3, 2.5, 2.7, 2.9, 3.1, 3.3, 3.5, 3.7, 3.9 ],
    "xPositions" : [xr1, xr2, xr3, xr4, xr5],
    "yPositions" : [yr1, yr2, yr3, yr4, yr5],
    "densities" : [
        [
            [dr1a1t1, dr2a1t1, dr3a1t1, dr4a1t1, dr5a1t1],
            [dr1a2t1, dr2a2t1, dr3a2t1, dr4a2t1, dr5a2t1],
            [dr1a3t1, dr2a3t1, dr3a3t1, dr4a3t1, dr5a3t1],
            [dr1a4t1, dr2a4t1, dr3a4t1, dr4a4t1, dr5a4t1],
            ...
        ],
        [
            [dr1a1t2, dr2a1t2, dr3a1t2, dr4a1t2, dr5a1t2],
            [dr1a2t2, dr2a2t2, dr3a2t2, dr4a2t2, dr5a2t2],
            [dr1a3t2, dr2a3t2, dr3a3t2, dr4a3t2, dr5a3t2],
            [dr1a4t2, dr2a4t2, dr3a4t2, dr4a4t2, dr5a4t2],
            ...
        ],
        [
            [dr1a1t3, dr2a1t3, dr3a1t3, dr4a1t3, dr5a1t3],
            [dr1a2t3, dr2a2t3, dr3a2t3, dr4a2t3, dr5a2t3],
            [dr1a3t3, dr2a3t3, dr3a3t3, dr4a3t3, dr5a3t3],
            [dr1a4t3, dr2a4t3, dr3a4t3, dr4a4t3, dr5a4t3],
            ...
        ],
        ...
    ],
    "uSpeeds" : [
        [
            [ur1a1t1, ur2a1t1, ur3a1t1, ur4a1t1, ur5a1t1],
            [ur1a2t1, ur2a2t1, ur3a2t1, ur4a2t1, ur5a2t1],
            [ur1a3t1, ur2a3t1, ur3a3t1, ur4a3t1, ur5a3t1],
            [ur1a4t1, ur2a4t1, ur3a4t1, ur4a4t1, ur5a4t1],
            ...
        ],
        [
            [ur1a1t2, ur2a1t2, ur3a1t2, ur4a1t2, ur5a1t2],
            [ur1a2t2, ur2a2t2, ur3a2t2, ur4a2t2, ur5a2t2],
            [ur1a3t2, ur2a3t2, ur3a3t2, ur4a3t2, ur5a3t2],
            [ur1a4t2, ur2a4t2, ur3a4t2, ur4a4t2, ur5a4t2],
            ...
        ],
        [
            [ur1a1t3, ur2a1t3, ur3a1t3, ur4a1t3, ur5a1t3],
            [ur1a2t3, ur2a2t3, ur3a2t3, ur4a2t3, ur5a2t3],
            [ur1a3t3, ur2a3t3, ur3a3t3, ur4a3t3, ur5a3t3],
            [ur1a4t3, ur2a4t3, ur3a4t3, ur4a4t3, ur5a4t3],
            ...
        ],
        ...
    ],    
    "vSpeeds" : [
        [
            [vr1a1t1, vr2a1t1, vr3a1t1, vr4a1t1, vr5a1t1],
            [vr1a2t1, vr2a2t1, vr3a2t1, vr4a2t1, vr5a2t1],
            [vr1a3t1, vr2a3t1, vr3a3t1, vr4a3t1, vr5a3t1],
            [vr1a4t1, vr2a4t1, vr3a4t1, vr4a4t1, vr5a4t1],
            ...
        ],
        [
            [vr1a1t2, vr2a1t2, vr3a1t2, vr4a1t2, vr5a1t2],
            [vr1a2t2, vr2a2t2, vr3a2t2, vr4a2t2, vr5a2t2],
            [vr1a3t2, vr2a3t2, vr3a3t2, vr4a3t2, vr5a3t2],
            [vr1a4t2, vr2a4t2, vr3a4t2, vr4a4t2, vr5a4t2],
            ...
        ],
        [
            [vr1a1t3, vr2a1t3, vr3a1t3, vr4a1t3, vr5a1t3],
            [vr1a2t3, vr2a2t3, vr3a2t3, vr4a2t3, vr5a2t3],
            [vr1a3t3, vr2a3t3, vr3a3t3, vr4a3t3, vr5a3t3],
            [vr1a4t3, vr2a4t3, vr3a4t3, vr4a4t3, vr5a4t3],
            ...
        ],
        ...
    ],
    "speeds" : [
        [
            [sr1a1t1, sr2a1t1, sr3a1t1, sr4a1t1, sr5a1t1],
            [sr1a2t1, sr2a2t1, sr3a2t1, sr4a2t1, sr5a2t1],
            [sr1a3t1, sr2a3t1, sr3a3t1, sr4a3t1, sr5a3t1],
            [sr1a4t1, sr2a4t1, sr3a4t1, sr4a4t1, sr5a4t1],
            ...
        ],
        [
            [sr1a1t2, sr2a1t2, sr3a1t2, sr4a1t2, sr5a1t2],
            [sr1a2t2, sr2a2t2, sr3a2t2, sr4a2t2, sr5a2t2],
            [sr1a3t2, sr2a3t2, sr3a3t2, sr4a3t2, sr5a3t2],
            [sr1a4t2, sr2a4t2, sr3a4t2, sr4a4t2, sr5a4t2],
            ...
        ],
        [
            [sr1a1t3, sr2a1t3, sr3a1t3, sr4a1t3, sr5a1t3],
            [sr1a2t3, sr2a2t3, sr3a2t3, sr4a2t3, sr5a2t3],
            [sr1a3t3, sr2a3t3, sr3a3t3, sr4a3t3, sr5a3t3],
            [sr1a4t3, sr2a4t3, sr3a4t3, sr4a4t3, sr5a4t3],
            ...
        ],
        ...
    ]
}
        
```

###`radars`

This array contains all radar id's, ordered alphabetically.

###`densities`

This property contains all densities for all timeframes used in the visualisation. Each timeframe contains 19 arrays, one per altitude. Each of these altitude arrays contain the densities for all radars.