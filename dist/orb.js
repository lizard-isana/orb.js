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
    let date = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : new Date();

    _classCallCheck(this, Time);

    _defineProperty(this, "time_in_day", function () {
      return this.hours / 24 + this.minutes / 1440 + this.seconds / 86400 + this.milliseconds / 86400000;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3JiLmpzIiwic291cmNlcyI6WyIuLi9zcmMvdGltZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZGVmYXVsdCBjbGFzcyBUaW1lIHtcbiAgY29uc3RydWN0b3IoZGF0ZSA9IG5ldyBEYXRlKCkpIHtcbiAgICB0aGlzLmRhdGUgPSBkYXRlO1xuICAgIHRoaXMueWVhciA9IGRhdGUuZ2V0VVRDRnVsbFllYXIoKTtcbiAgICB0aGlzLm1vbnRoID0gZGF0ZS5nZXRVVENNb250aCgpICsgMTtcbiAgICB0aGlzLmRheSA9IGRhdGUuZ2V0VVRDRGF0ZSgpO1xuICAgIHRoaXMuaG91cnMgPSBkYXRlLmdldFVUQ0hvdXJzKCk7XG4gICAgdGhpcy5taW51dGVzID0gZGF0ZS5nZXRVVENNaW51dGVzKCk7XG4gICAgdGhpcy5zZWNvbmRzID0gZGF0ZS5nZXRVVENTZWNvbmRzKCk7XG4gICAgdGhpcy5taWxsaXNlY29uZHMgPSBkYXRlLmdldFVUQ01pbGxpc2Vjb25kcygpXG4gIH1cbiAgdGltZV9pbl9kYXkgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuaG91cnMgLyAyNCArIHRoaXMubWludXRlcyAvIDE0NDAgKyB0aGlzLnNlY29uZHMgLyA4NjQwMCArIHRoaXMubWlsbGlzZWNvbmRzIC8gODY0MDAwMDA7XG4gIH1cbn0iXSwibmFtZXMiOlsiVGltZSIsImRhdGUiLCJEYXRlIiwiaG91cnMiLCJtaW51dGVzIiwic2Vjb25kcyIsIm1pbGxpc2Vjb25kcyIsInllYXIiLCJnZXRVVENGdWxsWWVhciIsIm1vbnRoIiwiZ2V0VVRDTW9udGgiLCJkYXkiLCJnZXRVVENEYXRlIiwiZ2V0VVRDSG91cnMiLCJnZXRVVENNaW51dGVzIiwiZ2V0VVRDU2Vjb25kcyIsImdldFVUQ01pbGxpc2Vjb25kcyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFxQkEsTUFBQUEsaUNBQ25CLFNBQStCLElBQUEsR0FBQTtFQUFBLEVBQUEsSUFBbkJDLElBQW1CLEdBQUEsU0FBQSxDQUFBLE1BQUEsR0FBQSxDQUFBLElBQUEsU0FBQSxDQUFBLENBQUEsQ0FBQSxLQUFBLFNBQUEsR0FBQSxTQUFBLENBQUEsQ0FBQSxDQUFBLEdBQVosSUFBSUMsSUFBSixFQUFZLENBQUE7O0VBQUEsRUFBQSxlQUFBLENBQUEsSUFBQSxFQUFBLElBQUEsQ0FBQSxDQUFBOztFQUFBLEVBQUEsZUFBQSxDQUFBLElBQUEsRUFBQSxhQUFBLEVBVWpCLFlBQVk7RUFDeEIsSUFBQSxPQUFPLEtBQUtDLEtBQUwsR0FBYSxFQUFiLEdBQWtCLElBQUEsQ0FBS0MsT0FBTCxHQUFlLElBQWpDLEdBQXdDLElBQUEsQ0FBS0MsT0FBTCxHQUFlLEtBQXZELEdBQStELElBQUtDLENBQUFBLFlBQUwsR0FBb0IsUUFBMUYsQ0FBQTtFQUNELEdBWjhCLENBQUEsQ0FBQTs7RUFDN0IsRUFBS0wsSUFBQUEsQ0FBQUEsSUFBTCxHQUFZQSxJQUFaLENBQUE7RUFDQSxFQUFBLElBQUEsQ0FBS00sSUFBTCxHQUFZTixJQUFJLENBQUNPLGNBQUwsRUFBWixDQUFBO0VBQ0EsRUFBQSxJQUFBLENBQUtDLEtBQUwsR0FBYVIsSUFBSSxDQUFDUyxXQUFMLEtBQXFCLENBQWxDLENBQUE7RUFDQSxFQUFBLElBQUEsQ0FBS0MsR0FBTCxHQUFXVixJQUFJLENBQUNXLFVBQUwsRUFBWCxDQUFBO0VBQ0EsRUFBQSxJQUFBLENBQUtULEtBQUwsR0FBYUYsSUFBSSxDQUFDWSxXQUFMLEVBQWIsQ0FBQTtFQUNBLEVBQUEsSUFBQSxDQUFLVCxPQUFMLEdBQWVILElBQUksQ0FBQ2EsYUFBTCxFQUFmLENBQUE7RUFDQSxFQUFBLElBQUEsQ0FBS1QsT0FBTCxHQUFlSixJQUFJLENBQUNjLGFBQUwsRUFBZixDQUFBO0VBQ0EsRUFBQSxJQUFBLENBQUtULFlBQUwsR0FBb0JMLElBQUksQ0FBQ2Usa0JBQUwsRUFBcEIsQ0FBQTtFQUNEOzs7Ozs7Ozs7OyJ9
