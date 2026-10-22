# Mortar Planner

Browser tool: place a mortar and a target on a map, pick the system (60mm M224, 81mm M252, 120mm M120) and charge, and see where the rounds land along the azimuth of fire, the charge's min/max range band, the elevation needed, and the miss distance. Optional PE ellipse.

Planning aid only. Charge min/max ranges are the published zone tables (FAS / GlobalSecurity), **unverified** against the current firing tables; elevation between min and max is an approximation. Azimuths are true north.

Edit `src/app.html`, then `python3 tools/build.py` to produce the single-file `index.html`.
