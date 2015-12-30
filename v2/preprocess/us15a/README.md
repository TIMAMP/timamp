
<h1>process_csv_us15a_bis</h1>

**Author: Wouter Van den Broeck**

[toc]

# Introduction

This project hosts a NodeJS application that generates the `data.json` file loaded by the `us15a` case study in the TIMAMP app. The source data is loaded from `data.csv` and the needed metadata is loaded from `metadata.json`. 

The run this application, run:

```
node index.js
```

# Data

Dataset `data.csv` provided (as `conditional_data_more_bands_out.csv`) by Garrett Bernstein on Dec. 10, 2015.

Notes:

- It's the same format as `process_csv_us15a` except each row is a single scan, so there's no averaging, because we only have one scan per time interval (6 minutes), station, and altitude combo.

### Strata (Altitude Bands)

In the source data the altitude bands are expressed as decimal values, e.g. 2.65, which represents the middle altitude in km of 100m altitude bands. The global altitude range is 0.2 - 3 km.

## Node dependencies

#### [node-csv](https://github.com/wdavidw/node-csv)

Used to read the records from the csv file.

#### [jsonfile](https://www.npmjs.com/package/jsonfile)

Used to write records as json.


