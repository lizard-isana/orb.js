//orb-observation.js

import {Constant} from './orb-core.js'
import {Time} from './orb-time.js'
import {EclipticToEquatorial} from './orb-coordinates.js'

export class Observer {
  constructor(position){
    const rad = Constant.RAD;
    const a = 6377.39715500; // earth radius
    const e2 = 0.006674372230614;
    const n = a/(Math.sqrt(1-e2*Math.cos(position.latitude*rad)))
    this.latitude = position.latitude
    this.longitude = position.longitude
    this.altitude = position.altitude  
  }

  rectangular = (time) =>{
    const rad = Constant.RAD;
    const lat = this.latitude;
    const lng = this.longitude;
    const gmst = time.gmst();
    const lst = gmst*15 + lng;
    const a = 6378.135 + this.altitude;  //Earth's equational radius in WGS-72 (km)
    const f = 0.00335277945 //Earth's flattening term in WGS-72 (= 1/298.26)
    const sin_lat =Math.sin(lat*rad);
    const c = 1/Math.sqrt(1+f*(f-2)*sin_lat*sin_lat);
    const s = (1-f)*(1-f)*c;
    return {
      x: a*c*Math.cos(lat*rad)*Math.cos(lst*rad),
      y: a*c*Math.cos(lat*rad)*Math.sin(lst*rad),
      z: a*s*Math.sin(lat*rad)
    }
  }
}

export class Observation {
  constructor(param){
    this.observer = param.observer;
    this.target = param.target;
  }
  
  AtmosphericRefraction = (elevation) =>{
    const rad = Constant.RAD;
    const tmp = elevation+7.31/(elevation + 4.4)
    const ar = 0.0167*rad/(Math.tan(tmp*rad))/rad
    return ar
  }

  RadecToHorizontal = (time,radec) => {
    const rad = Constant.RAD;
    const observer = this.observer;
    const ra = Number(radec.ra);
    let dec = Number(radec.dec);
    let distance;
    if(radec.distance != undefined){
      distance = Number(radec.distance);
    }else{
      distance = undefined
    }
    const latitude = Number(observer.latitude);
    const longitude = Number(observer.longitude);
    const altitude = Number(observer.altitude);
    dec = dec*rad
    const gmst = time.gmst();
    const hour_angle = (gmst*15 + longitude - (ra*15));
    const h = hour_angle*rad;
    const lat = latitude*rad;
    let azimuth = (Math.atan2(-Math.cos(dec)*Math.sin(h),Math.sin(dec)*Math.cos(lat)-Math.cos(dec)*Math.sin(lat)*Math.cos(h)))/rad;
    const elevation = (Math.asin(Math.sin(dec)*Math.sin(lat)+Math.cos(lat)*Math.cos(dec)*Math.cos(h)))/rad;
    const atmospheric_refraction = this.AtmosphericRefraction(elevation)
    if (azimuth<0){
      azimuth = azimuth%360 +360
    }
    return {
      "azimuth" : azimuth,
      "elevation" : elevation,
      "distance": distance,
      "atmospheric_refraction":atmospheric_refraction
     }
  }
  
  RectToHorizontal = (time,rect) => {
    function get_distance_unit(target){
      if(target.unit_keywords.match(/km/)){
        return " km"
      }else if(target.unit_keywords.match(/au/)){
        return " au"
      }else{
        return ""
      }
    }
    const distance_unit = get_distance_unit(rect)
    const rad = Constant.RAD;
    const observer = this.observer;
    const lat = observer.latitude;
    const lng = observer.longitude;
    const obsv = new Observer(observer);
    const ob = obsv.rectangular(time)
    const rx0 = rect.x - ob.x;
    const ry0 = rect.y - ob.y
    const rz0 = rect.z - ob.z
    const gmst = time.gmst();
    const lst = gmst*15 + lng;
    const rs = Math.sin(lat*rad)*Math.cos(lst*rad)*rx0 + Math.sin(lat*rad)*Math.sin(lst*rad)*ry0-Math.cos(lat*rad)*rz0;
    const re = -Math.sin(lst*rad)*rx0 + Math.cos(lst*rad)*ry0;
    const rz = Math.cos(lat*rad)*Math.cos(lst*rad)*rx0+Math.cos(lat*rad)*Math.sin(lst*rad)*ry0 + Math.sin(lat*rad)*rz0;
    const range = Math.sqrt(rs*rs+re*re+rz*rz);
    const elevation = Math.asin(rz/range)/rad;
    const atmospheric_refraction = this.AtmosphericRefraction(elevation)
    let azimuth  = Math.atan2(-re,rs);
    azimuth = azimuth/rad+180;
    if (azimuth>360){
      azimuth = azimuth%360;
    }
    return {
    "azimuth" : azimuth,
    "elevation" : elevation,
    "distance": range,
    "atmospheric_refraction":atmospheric_refraction,
    "coordinate_keywords":"horizontal spherical",
    "unit_keywords": "degree" + distance_unit
   }
  }

  azel = (date) => {
    const rad = Constant.RAD;
    const target = this.target;
    const observer = this.observer;
    const time = new Time(date)
    function get_distance_unit(target){
      if(target.unit_keywords.match(/km/)){
        return " km"
      }else if(target.unit_keywords.match(/au/)){
        return " au"
      }else{
        return ""
      }
    }
    let target_date,rect,horizontal,radec,distance_unit

    if(target.ra != undefined && target.dec != undefined){
      const horizontal = this.RadecToHorizontal(time,target)
      const distance_unit = " au"
    }else if(target.x != undefined && target.y != undefined && target.z != undefined){
      if(target.coordinate_keywords.match(/ecliptic/)){
        if(target.date != undefined ){
          target_date = target.date;
        }else{
          target_date = date;
        }
        rect = EclipticToEquatorial({"date":target_date,"ecliptic":target})
      }else{
        rect = target
      }
      horizontal = this.RectToHorizontal(time,rect)
      distance_unit = get_distance_unit(rect)
    }else if(target.radec != undefined){
      radec = target.radec(date)
      horizontal = this.RadecToHorizontal(time,radec)
      distance_unit = get_distance_unit(radec)
    }else if(target.xyz != undefined){
      rect = target.xyz(date);
      horizontal = this.RectToHorizontal(time,rect)
      distance_unit = get_distance_unit(rect)
    }

    return {
      "azimuth" : horizontal.azimuth,
      "elevation" : horizontal.elevation,
      "distance": horizontal.distance,
      "atmospheric_refraction":horizontal.atmospheric_refraction,
      "date":date,
      "coordinate_keywords":"horizontal spherical",
      "unit_keywords": "degree" + distance_unit
    }
  }
}

