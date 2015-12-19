
<h1>process_csv_us15a</h1>

**Author: Wouter Van den Broeck**

[toc]

# Introduction

This project hosts a NodeJS application that generates the `data.json` file loaded by the `us15a` case study in the TIMAMP app, i.e. `tipaths_03d`. The source data is loaded from `data.csv` and the required metadata is loaded from `metadata.json`. 

The run this application, execute:

```
node index.js
```

# Data

- For scans in which we have identified rain, we have set the ___velocity___ to 0 so that no lines/particles are created there. This is a temporary fix until the viz setups can directly handle weather.


### Query template

The query is a variation of the query proposed [here](https://github.com/enram/case-study/tree/master/data/bird-migration-altitude-profiles#aggregation).
This variation aggregate altitudes depending on the template parameter ___strataSize___.

The resulting records also contain the values:
TODO

### Strata (Altitude Bands)

| id in source csv | range | index in data.json |
|:----------------:|-------|:--------------------:|
| 1 | 0.2 - 1.6 km | 0 |
| 2 | 1.6 - 3.0 km | 1 |

### vertical_integrated_density

The following SQL was used to generate the data.

```
round(avg(bird_density),5) AS avg_bird_density,
CASE
        WHEN altitude_band = 1 THEN round((avg(bird_density) * 7 /5),5)
        WHEN altitude_band = 2 THEN round((avg(bird_density) * 7 /5),5)
END AS vertical_integrated_density
GROUP BY
    radar_id,
    interval_start_time,
    altitude_band
```
The `vertical_integrated_density` is thus the number of birds per km^2 per strata, obtained by multiplying the height of each strata with the `bird_density`, which is the number of birds per km^3. Both strata have a height of 1.4 km, thus the average density is multiplied by 1.4 (7/5 or 14/10).

# Node dependencies

### [node-csv](https://github.com/wdavidw/node-csv)

Used to read the records from the csv file.

### [jsonfile](https://www.npmjs.com/package/jsonfile)

Used to write records as json.


