Orb = Orb || {};
// orb-date-handler.js

Orb.DigitsToDate = Orb.DigitsToDate || function(digits){
  var year =Number(digits.substring(0,4));
  var month = Number(digits.substring(4,6));
  var day = Number(digits.substring(6,8));
  if(digits.length>8){
    var hour = Number(digits.substring(8,10));
  }else{
    var hour = 0;
  }
  if(digits.length>10){
    var min = Number(digits.substring(10,12));
  }else{
    var min = 0;
  }
  if(digits.length>12){
    var sec = Number(digits.substring(12,14));
  }else{
    var sec = 0;
  }
  var date = new Date();
  date.setTime(Date.UTC(year,month-1,day,hour,min,sec))
  return date;
}

Orb.DateToDigits = Orb.DateToDigits || function(date){
  var year = String(date.getUTCFullYear());
  var month = String(date.getUTCMonth()+1);
  if (month<10){month = "0" + month}
  var day = String(date.getUTCDate());
  if (day<10){day = "0" + day}
  var hour = String(date.getUTCHours());
  if (hour<10){hour = "0" + hour}
  var min = String(date.getUTCMinutes())
  if (min<10){min = "0" + min}
  var sec = String(date.getUTCSeconds());
  if (sec<10){sec = "0" + sec}
  var digits = year+month+day+hour+min+sec;
  return digits;
}

Orb.StringToDate = Orb.StringToDate || function(str){
  var str = str.split('Z')[0];
  str.match(/(T|_| )/i);
  var dt=str.split(RegExp.$1);
  var dt0 = dt[0]
  if(dt0.match(/\./i)){
    var d = dt0.split(".");
  }else{
    var d = dt0.split("-");
  }
  if(d.length>3){
    d.shift()
    d[0] = 0-Number(d[0]);
  }
  if(dt[1]){
    var t = dt[1].split(":");
  }else{
    var t = [];
  }
  var year = d[0];
  var month = d[1];
  var day = d[2];
  if(t[0]){
    var hours = t[0]
  }else{
    var hours = 0
  };
  if(t[1]){
    var minutes = t[1]
  }else{
    var minutes = 0
  };
  if(t[2]){
    var sec = t[2].split(".");
    var seconds = sec[0];
    if(sec[1]){
      var milliseconds = Number("0." + sec[1])*1000
    }else if(t[3]){
      var milliseconds = t[3];
    }else{
      var milliseconds = 0;
    }
  }else{
    var seconds = 0;
    var milliseconds = 0;
  };
  var date = new Date(Date.UTC(year, month-1, day, hours, minutes, seconds, milliseconds))
  date.setUTCFullYear(year);
  return date;
}

Orb.FormatUTCDate = Orb.FormatUTCDate || function(date){
  var year = date.getUTCFullYear()
  var month = date.getUTCMonth()+1
  var day = date.getUTCDate()
  var hours = date.getUTCHours()
  var minutes = date.getUTCMinutes()
  var seconds = date.getUTCSeconds()
  var milliseconds = date.getUTCMilliseconds()
  if(milliseconds > 0){
    seconds = seconds + milliseconds/1000
  }
  if(seconds.length<2){
    seconds = Orb.ZeroFill(seconds,2)
  }
  return year +"-"+Orb.ZeroFill(month,2) + "-" + Orb.ZeroFill(day,2)  + " " + Orb.ZeroFill(hours,2) + ":" + Orb.ZeroFill(minutes,2) + ":" + seconds

}

Orb.FormatLocalDate = Orb.FormatLocalDate || function(date){
  var year = date.getFullYear()
  var month = date.getMonth()+1
  var day = date.getDate()
  var hours = date.getHours()
  var minutes = date.getMinutes()
  var seconds = date.getSeconds()
  var milliseconds = date.getMilliseconds()
  if(milliseconds > 0){
    seconds = seconds + milliseconds/1000
  }
  if(seconds.length<2){
    seconds = Orb.ZeroFill(seconds,2)
  }
  return year +"-"+Orb.ZeroFill(month,2) + "-" + Orb.ZeroFill(day,2)  + " " + Orb.ZeroFill(hours,2) + ":" + Orb.ZeroFill(minutes,2) + ":" + seconds
}

Orb.ZeroFill = function(num,length){
  if(length){
    var length=length;
  }else{
    var length=num.length;
  }
  var seed="0000000000"
  var str = seed + String(num)
  return str.slice(0-length)
 }
