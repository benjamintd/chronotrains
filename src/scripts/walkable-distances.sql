-- insert computed durations for walkable station-station paths
with close_stations as (
select s.id as from_station_id , cs.id as to_station_id, (st_distance(st_transform(s.geom, 2154), st_transform(cs.geom, 2154)) / 1000) as dist from stations s
join stations as cs ON ST_DWithin(s.geom, cs.geom, 0.4)  and s.id != cs.id
)


insert into direct_times  (from_station_id, to_station_id, distance_km, duration, source)
select from_station_id, to_station_id, dist::integer as distance_km, greatest(1, (dist / 0.15)::integer) as duration, 'computed' as source
from close_stations where dist < 10
on conflict do nothing

