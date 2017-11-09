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
    str.match(/(T|_| )/i);
    var dt=str.split(RegExp.$1);
    var dt0 = dt[0]
    dt0.match(/(-|\.)/i);
    var d = dt0.split(RegExp.$1);
    if(dt[1]){
      var t = dt[1].split(":");
    }else{
      var t = [];
    }
    var year =d[0];
    var month = d[1];
    var day = d[2];
    if(t[0]){var hour = t[0]}else{var hour = 0};
    if(t[1]){var min = t[1]}else{var hour = 0};
    if(t[2]){var sec = t[2]}else{var hour = 0};
    var date = new Date();
    date.setTime(Date.UTC(year,month-1,day,hour,min,sec))
    return date;
  }

Orb.FormatUTCDate = Orb.FormatUTCDate || function(date){
  var year = date.getUTCFullYear()
  var month = date.getUTCMonth()+1
  if(month>12){
    year = year +1;
    month = 12-month;
  }
  var day = date.getUTCDate()
  var hours = date.getUTCHours()
  var minutes = date.getUTCMinutes()
  var seconds = date.getUTCSeconds()

  return year +"-"+Orb.ZeroFill(month) + "-" + Orb.ZeroFill(day)  + " " + Orb.ZeroFill(hours) + ":" + Orb.ZeroFill(minutes) + ":" + Orb.ZeroFill(seconds)

}

Orb.FormatLocalDate = Orb.FormatLocalDate || function(date){
  var year = date.getFullYear()
  var month = date.getUTCMonth()+1
  if(month>12){
    year = year +1;
    month = 12-month;
  }
  var day = date.getDate()
  var hours = date.getHours()
  var minutes = date.getMinutes()
  var seconds = date.getSeconds()
  return year +"-"+Orb.ZeroFill(month) + "-" + Orb.ZeroFill(day)  + " " + Orb.ZeroFill(hours) + ":" + Orb.ZeroFill(minutes) + ":" + Orb.ZeroFill(seconds)
}

Orb.ZeroFill = function(num){
    if(num<10){
     var str = "0" + num;
    }else{
     var str = num;
    }
    return str;
}
