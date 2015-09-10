# Test
SELECT
  DIV(CAST((EXTRACT(EPOCH FROM start_time) -
            EXTRACT(EPOCH FROM TIMESTAMP '{{from}}')) AS NUMERIC),
      {{winDur}})
      AS window_idx,
  altitude,
  radar_id,
  AVG(bird_density) AS bird_density,
  AVG(u_speed) AS u_speed,
  AVG(v_speed) AS v_speed,
  # In the following line, a plus-sign is written in its url-encoded form
  # %2B, because this plus-sign does not seem to be encoded by the AJAX-
  # functionality:
  SQRT(POWER(AVG(u_speed), 2) %2B POWER(AVG(v_speed), 2)) AS speed

FROM bird_migration_altitude_profiles

WHERE altitude >= {{minAlt}}
  AND altitude <= {{maxAlt}}
  AND radial_velocity_std >= 2
  AND start_time >= '{{from}}'
  AND start_time < '{{till}}'

GROUP BY window_idx, altitude, radar_id
ORDER BY window_idx, altitude, radar_id
