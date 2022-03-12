(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Orb = {}));
})(this, (function (exports) { 'use strict';

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    Object.defineProperty(Constructor, "prototype", {
      writable: false
    });
    return Constructor;
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  let Time = /*#__PURE__*/_createClass(function Time() {
    var _this = this;

    let date = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : new Date();

    _classCallCheck(this, Time);

    _defineProperty(this, "time_in_day", function () {
      return _this.hours / 24 + _this.minutes / 1440 + _this.seconds / 86400 + _this.milliseconds / 86400000;
    });

    _defineProperty(this, "jd", function () {
      const year = _this.year;
      const month = _this.month;
      const day = _this.day;

      const time_in_day = _this.time_in_day();

      if (month <= 2) {
        year = year - 1;
        month = month + 12;
      }

      const julian_day = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day - 1524.5;
      let transition_offset;

      if (julian_day < 2299160.5) {
        transition_offset = 0;
      } else {
        const tmp = Math.floor(year / 100);
        transition_offset = 2 - tmp + Math.floor(tmp / 4);
      }

      const jd = julian_day + transition_offset + time_in_day;
      return jd;
    });

    this.date = date;
    this.year = date.getUTCFullYear();
    this.month = date.getUTCMonth() + 1;
    this.day = date.getUTCDate();
    this.hours = date.getUTCHours();
    this.minutes = date.getUTCMinutes();
    this.seconds = date.getUTCSeconds();
    this.milliseconds = date.getUTCMilliseconds();
  });

  exports.Time = Time;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3JiLmpzIiwic291cmNlcyI6WyIuLi9zcmMvdGltZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZGVmYXVsdCBjbGFzcyBUaW1lIHtcbiAgY29uc3RydWN0b3IoZGF0ZSA9IG5ldyBEYXRlKCkpIHtcbiAgICB0aGlzLmRhdGUgPSBkYXRlO1xuICAgIHRoaXMueWVhciA9IGRhdGUuZ2V0VVRDRnVsbFllYXIoKTtcbiAgICB0aGlzLm1vbnRoID0gZGF0ZS5nZXRVVENNb250aCgpICsgMTtcbiAgICB0aGlzLmRheSA9IGRhdGUuZ2V0VVRDRGF0ZSgpO1xuICAgIHRoaXMuaG91cnMgPSBkYXRlLmdldFVUQ0hvdXJzKCk7XG4gICAgdGhpcy5taW51dGVzID0gZGF0ZS5nZXRVVENNaW51dGVzKCk7XG4gICAgdGhpcy5zZWNvbmRzID0gZGF0ZS5nZXRVVENTZWNvbmRzKCk7XG4gICAgdGhpcy5taWxsaXNlY29uZHMgPSBkYXRlLmdldFVUQ01pbGxpc2Vjb25kcygpXG4gIH1cbiAgdGltZV9pbl9kYXkgPSAoKSA9PiAge1xuICAgIHJldHVybiB0aGlzLmhvdXJzIC8gMjQgKyB0aGlzLm1pbnV0ZXMgLyAxNDQwICsgdGhpcy5zZWNvbmRzIC8gODY0MDAgKyB0aGlzLm1pbGxpc2Vjb25kcyAvIDg2NDAwMDAwO1xuICB9XG4gIGpkID0gKCkgPT4ge1xuICAgIGNvbnN0IHllYXIgPSB0aGlzLnllYXI7XG4gICAgY29uc3QgbW9udGggPSB0aGlzLm1vbnRoOztcbiAgICBjb25zdCBkYXkgPSB0aGlzLmRheTtcbiAgICBjb25zdCB0aW1lX2luX2RheSA9IHRoaXMudGltZV9pbl9kYXkoKVxuICAgIGlmIChtb250aCA8PSAyKSB7XG4gICAgICB5ZWFyID0geWVhciAtIDE7XG4gICAgICBtb250aCA9IG1vbnRoICsgMTI7XG4gICAgfVxuICAgIGNvbnN0IGp1bGlhbl9kYXkgPSBNYXRoLmZsb29yKDM2NS4yNSAqICh5ZWFyICsgNDcxNikpICsgTWF0aC5mbG9vcigzMC42MDAxICogKG1vbnRoICsgMSkpICsgZGF5IC0gMTUyNC41O1xuICAgIGxldCB0cmFuc2l0aW9uX29mZnNldDtcbiAgICBpZiAoanVsaWFuX2RheSA8IDIyOTkxNjAuNSkge1xuICAgICAgdHJhbnNpdGlvbl9vZmZzZXQgPSAwO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0bXAgPSBNYXRoLmZsb29yKHllYXIgLyAxMDApO1xuICAgICAgdHJhbnNpdGlvbl9vZmZzZXQgPSAyIC0gdG1wICsgTWF0aC5mbG9vcih0bXAgLyA0KTtcbiAgICB9XG4gICAgY29uc3QgamQgPSBqdWxpYW5fZGF5ICsgdHJhbnNpdGlvbl9vZmZzZXQgKyB0aW1lX2luX2RheTtcbiAgICByZXR1cm4gamQ7XG4gIH1cbn0iXSwibmFtZXMiOlsiVGltZSIsImRhdGUiLCJEYXRlIiwiaG91cnMiLCJtaW51dGVzIiwic2Vjb25kcyIsIm1pbGxpc2Vjb25kcyIsInllYXIiLCJtb250aCIsImRheSIsInRpbWVfaW5fZGF5IiwianVsaWFuX2RheSIsIk1hdGgiLCJmbG9vciIsInRyYW5zaXRpb25fb2Zmc2V0IiwidG1wIiwiamQiLCJnZXRVVENGdWxsWWVhciIsImdldFVUQ01vbnRoIiwiZ2V0VVRDRGF0ZSIsImdldFVUQ0hvdXJzIiwiZ2V0VVRDTWludXRlcyIsImdldFVUQ1NlY29uZHMiLCJnZXRVVENNaWxsaXNlY29uZHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBcUJBLE1BQUFBLGlDQUNuQixTQUErQixJQUFBLEdBQUE7RUFBQSxFQUFBLElBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7RUFBQSxFQUFBLElBQW5CQyxJQUFtQixHQUFBLFNBQUEsQ0FBQSxNQUFBLEdBQUEsQ0FBQSxJQUFBLFNBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxTQUFBLEdBQUEsU0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFaLElBQUlDLElBQUosRUFBWSxDQUFBOztFQUFBLEVBQUEsZUFB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
