# Case study ___us15a___

This case study is based on hourly data from 13 Weather Surveillance Radar-1988 Doppler (hereafter WSR-88D) stations in the northeastern United States from the National Climatic Data Center. Hourly data was selected from within a 37.5 km radius of each radar station and up to 3000 m above the radar station for all scans between local civil twilight dusk and dawn, beginning after sunset on 8 September to sunrise on 11 September 2010.

### Notes:

- The data is published on [https://gbernstein.cartodb.com/api/v2/](https://gbernstein.cartodb.com/api/v2/).
- For scans in which we have identified rain, we have set the ___velocity___ to 0 so that no lines/particles are created there. This is a temporary fix until the viz setups can directly handle weather.

## Query template

The query is a variation of the query proposed [here](https://github.com/enram/case-study/tree/master/data/bird-migration-altitude-profiles#aggregation).
This variation aggregate altitudes depending on the template parameter ___strataSize___.

The resulting records also contain the values:

* avg_speed
* altitude_idx
* interval_idx

## References

