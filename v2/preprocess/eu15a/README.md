
<h1>Preprocess_eu15a</h1>

**Author: Wouter Van den Broeck**

[toc]

# Introduction

This project provides a NodeJS application that generates the `data.json` file loaded by the `eu15a` case study in the TIMAMP v2 app. The source data is loaded from `data.csv` and the needed metadata is loaded from `metadata.json`. 

The run this application, run (from the `preprocess` directory):

```
node process_eu15a.js
```

# Data

For this case study, the data is loaded from the database at `http://lifewatch.cartodb.com`.

For a general description, see `./v2/src/data/eu15a/README.md`.

## Data retrieval and processing

The query is a variation of the query proposed [here](https://github.com/enram/case-study/tree/master/data/bird-migration-altitude-profiles#aggregation).
This variation aggregate altitudes depending on the template parameter ___strataSize___.

The resulting records also contain the values:

* avg_speed
* altitude_idx
* interval_idx

For additional details, see [TODO: add reference to paper].

# Dependencies

- [jsonfile](https://www.npmjs.com/package/jsonfile) – Used to write records as json.
- [Moment](http://momentjs.com/) – Parse, validate, manipulate, and display dates in JavaScript.
- Request – Simplified HTTP client.

