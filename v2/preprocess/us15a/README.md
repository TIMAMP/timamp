
<h1>Preprocess_us15a</h1>

**Author: Wouter Van den Broeck**

[toc]

# Introduction

This project provides a NodeJS application that generates the `data.json` file loaded by the `us15a` case study in the TIMAMP v2 app. The source data is loaded from `data.csv` and the needed metadata is loaded from `metadata.json`. 

The run this application, run:

```
node index.js
```

# Data

Dataset `data.csv` provided (as `conditional_data_more_bands_out.csv`) by Garrett Bernstein on Dec. 10, 2015. Each row in this source data is a single unaggregated original scan. 

The altitude bands in the source data are expressed as decimal values, e.g. 2.65, which represents the middle altitude in km of 100m altitude bands. The global altitude range is 0.2 - 3 km.

For more details, see `./v2/src/data/us15a/README.md`.

For additional details, see [TODO: add reference to paper].

# Dependencies

- [node-csv](https://github.com/wdavidw/node-csv) – Used to read the records from the csv file.
- [jsonfile](https://www.npmjs.com/package/jsonfile) – Used to write records as json.
- [Moment](http://momentjs.com/) – Parse, validate, manipulate, and display dates in JavaScript.

