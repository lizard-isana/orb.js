# orb.js（v2）- JavaScript library for astronomical calculations

***Please note: There is no compatibility orb.js v1 and v2.***

orb.js has methods for the ...
- Position of 8 planets(VSOP87), sun and moon
- Keplerian orbital elements
- Position of artificial satellites(SGP4)
- Apparent position of celestial objects
- Time conversions
- Coordinates conversions

## Usage
  English: [usage.en.md](/usage.en.md)  
  日本語: [usage.ja.md](/usage.ja.md)

## Example
    var date = new Date();

    // Position of planets
    var mars = new Orb.VSOP("Mars");
    var rectangular = mars.xyz(date); // ecliptic rectangular coordinates(x, y, z)
    var spherical = mars.radec(date); // equatorial spherical coordinates(ra, dec, distance)

    // Position of the moon
    var luna = new Orb.Luna();
    var rectangular = luna.xyz(date); // Earth centered equatorial rectangular coordinates (x, y, z)
    var spherical = luna.radec(date); // equatorial spherical coordinates(ra, dec, distance)

    // Apparent position of the Sun
    var sun = new Orb.Sun();
    var rectangular = sun.xyz(date); // Earth centered equatorial rectangular coordinates (x, y, z)
    var spherical = sun.radec(date); // equatorial spherical coordinates(ra, dec, distance)

    // Kepler orbital elements
    var asteroid = new Orb.Kepler({
      "gm": 2.9591220828559093*Math.pow(10,-4); //(au^3/d^2) default value is the sun, so you can omit this line.
      "eccentricity":"0.08728849329001058",
      "inclination":"6.812676631845272",
      "longitude_of_ascending_node":"250.5660658100269",
      "argument_of_periapsis":"95.63473165761138",
      "time_of_periapsis":"2456918.756066796",
      "semi_major_axis":"1.001911878091084"
    });
    var rectangular = asteroid.xyz(date); // ecliptic rectangular coordinates(x, y, z)
    var spherical = asteroid.radec(date); // equatorial spherical coordinates(ra, dec, distance)

    // Position of artificial satellites from Two Line Elements(TLE)
    var tle = {
      first_line:"1 25544U 98067A   15012.59173611  .00014829  00000-0  23845-3 0  7179",
      second_line:"2 25544 051.6466 140.7335 0006107 243.2909 291.5211 15.53213268923827"
    }
    var satellite = new Orb.SGP4(tle);
    var rectangular = satellite.xyz(date); // Earth centered equatorial rectangular coordinates (x, y, z)
    var spherical = satellite.latlng(date); // geographic spherical coordinates(latitude, longitude, altitude)

    // Azimuth and Elevation
    var your_location = {
      "latitude":35.658,
      "longitude":139.741,
      "altitude":0
    }

    var observe_mars = new Orb.Observation({"observer":your_location,"target":mars});
    var horizontal = observe_mars.azel(date); // horizontal coordinates(azimuth, elevation)

    var observe_satellite = new Orb.Observation({"observer":your_location,"target":satellite});
    var horizontal = observe_satellite.azel(date); // horizontal coordinates(azimuth, elevation)

    var sirius = {
      "ra":6.75257,
      "dec":-16.7131,
      "distance":543300
    }

    var observe_star = new Orb.Observation({
      "observer":your_location ,
      "target":sirius
    });
    var horizontal = observe_star.azel(date); // horizontal coordinates(azimuth, elevation)

    // Time conversion
    var time = new Orb.Time(date);
    var gmst = time.gmst();
    var julian_date = time.jd();
    var time_in_day = time.time_in_day();
    var day_of_year = time.doy();

    // Coordinates conversion
    var equatorial_rectangular = Orb.RadecToXYZ(sirius)
    var ecliptic_rectangular = Orb.EquatorialToEcliptic({"date":date,"equatorial":equatorial_rectangular})
    var equatorial_rectangular = Orb.EclipticToEquatorial({"date":date,"ecliptic":ecliptic_rectangular})
    var equatorial_spherical = Orb.XYZtoRadec(equatorial_rectangular)


## License
 Copyright (c) 2012-2017 Isana Kashiwai  
 Licensed under the [MIT license](/MIT-LICENSE).

## Administrator
  Isana Kashiwai  
  email: isana.k at gmail.com
