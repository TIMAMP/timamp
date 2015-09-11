
# This query is a variation of the query proposed on https://github.com/enram/case-study/tree/master/data/bird-migration-altitude-profiles#aggregation
# This variation does not aggregate altitudes and adds the avg_speed, altitude_idx and
# interval_idx values, and is intended to load data from
# https://gbernstein.cartodb.com/api/v2/.

# Information about the data:
# - for scans in which we have identified rain, we have set the velocity to 0 so that
#   no lines/particles are created there. This is a temporary fix until the viz setups
#   can directly handle weather
# - the dataset includes the proper groundspeed

WITH conditional_data AS (
    SELECT
        DIV(CAST((EXTRACT(EPOCH FROM start_time) -
                  EXTRACT(EPOCH FROM TIMESTAMP '{{from}}')) AS NUMERIC),
            {{interval}})
            AS interval_idx,
        altitude,
        ((altitude * 10) - 0.5) AS altitude_idx,
        radar_id,
        u_speed,
        CASE
            WHEN radial_velocity_std >= 2 AND bird_density >= 1 THEN u_speed
            ELSE NULL
        END AS conditional_u_speed,
        v_speed,
        CASE
            WHEN radial_velocity_std >= 2 AND bird_density >= 1 THEN v_speed
            ELSE NULL
        END AS conditional_v_speed,
        CASE
            WHEN bird_density IS NULL THEN NULL
            WHEN radial_velocity_std >= 2 THEN bird_density
            ELSE 0
        END AS bird_density

  FROM enram_case_study

  WHERE altitude <= 4.0
    AND start_time >= '{{from}}'
    AND start_time < '{{till}}'
)

SELECT
    interval_idx,
    altitude_idx,
    radar_id,
    ROUND(AVG(bird_density)::NUMERIC, 5) AS avg_bird_density,
    CASE
        WHEN AVG(conditional_u_speed) IS NOT NULL
             THEN ROUND(AVG(conditional_u_speed)::NUMERIC, 5)
        WHEN AVG(u_speed) IS NOT NULL THEN 0
        ELSE NULL
    END AS avg_u_speed,
    CASE
        WHEN AVG(conditional_v_speed) IS NOT NULL
             THEN ROUND(AVG(conditional_v_speed)::NUMERIC, 5)
        WHEN AVG(v_speed) IS NOT NULL THEN 0
        ELSE NULL
    END AS avg_v_speed,
    # In the following, a plus-sign is written in its url-encoded form
    # %2B, because this plus-sign does not seem to be encoded by the AJAX-
    # functionality:
    CASE
        WHEN AVG(conditional_u_speed) IS NOT NULL
         AND AVG(conditional_v_speed) IS NOT NULL
             THEN SQRT(POWER(AVG(u_speed), 2) %2B POWER(AVG(v_speed), 2))
        WHEN AVG(u_speed) IS NOT NULL
         AND AVG(v_speed) IS NOT NULL
             THEN 0
        ELSE NULL
    END AS avg_speed,
    COUNT (*) AS number_of_measurements

FROM conditional_data

GROUP BY
    interval_idx,
    altitude_idx,
    radar_id

ORDER BY
    interval_idx,
    altitude_idx,
    radar_id
