with t as (
select id, name, st_setsrid(st_makepoint(longitude_e7 / 10000000., latitude_e7 / 10000000.), 4326) as geometry, max(1. * direct_times.distance_km *  direct_times.distance_km / direct_times.duration) as max_speed
from stations
JOIN direct_times on stations.id = direct_times.to_station_id
group by id, name, geometry
order by max_speed desc
),

ordered_stations as (select id, name, geometry from t)

SELECT json_build_object(
    'type', 'FeatureCollection',
    'features', json_agg(ST_AsGeoJSON(ordered_stations.*)::json)
    )

from ordered_stations
