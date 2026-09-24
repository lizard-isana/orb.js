/*! orb.js browser compatibility preflight */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.OrbCompatibility = {}));
})(this, (function (exports) { 'use strict';

  var BROWSER_BASELINE = 'Chrome/Edge 92+, Firefox 90+, Safari/iOS Safari 15.4+, Chrome for Android 92+, Firefox for Android 90+';

  function getGlobalObject() {
    if (typeof globalThis !== 'undefined') return globalThis;
    if (typeof self !== 'undefined') return self;
    if (typeof window !== 'undefined') return window;
    if (typeof global !== 'undefined') return global;
    return {};
  }

  var FEATURE_TESTS = [
    {
      name: 'Map',
      available: function (environment) {
        return typeof environment.Map === 'function';
      },
      works: function (environment) {
        var values = new environment.Map();
        values.set('orb', 1);
        return values.get('orb') === 1;
      }
    },
    {
      name: 'Set',
      available: function (environment) {
        return typeof environment.Set === 'function';
      },
      works: function (environment) {
        var values = new environment.Set();
        values.add('orb');
        return values.has('orb');
      }
    },
    {
      name: 'Symbol.iterator',
      available: function (environment) {
        return typeof environment.Symbol === 'function'
          && typeof environment.Symbol.iterator !== 'undefined';
      },
      works: function () {
        return true;
      }
    },
    {
      name: 'Float64Array.from',
      available: function (environment) {
        return typeof environment.Float64Array === 'function'
          && typeof environment.Float64Array.from === 'function';
      },
      works: function (environment) {
        var value = environment.Float64Array.from([1, 2]);
        return value.length === 2 && value[1] === 2;
      }
    },
    {
      name: 'Float64Array.of',
      available: function (environment) {
        return typeof environment.Float64Array === 'function'
          && typeof environment.Float64Array.of === 'function';
      },
      works: function (environment) {
        var value = environment.Float64Array.of(1, 2);
        return value.length === 2 && value[0] === 1;
      }
    },
    {
      name: 'Number.isFinite',
      available: function (environment) {
        return environment.Number && typeof environment.Number.isFinite === 'function';
      },
      works: function (environment) {
        return environment.Number.isFinite(1) && !environment.Number.isFinite(Infinity);
      }
    },
    {
      name: 'Number.isInteger',
      available: function (environment) {
        return environment.Number && typeof environment.Number.isInteger === 'function';
      },
      works: function (environment) {
        return environment.Number.isInteger(1) && !environment.Number.isInteger(1.5);
      }
    },
    {
      name: 'Number.isSafeInteger',
      available: function (environment) {
        return environment.Number && typeof environment.Number.isSafeInteger === 'function';
      },
      works: function (environment) {
        return environment.Number.isSafeInteger(1)
          && !environment.Number.isSafeInteger(9007199254740992);
      }
    },
    {
      name: 'Number.EPSILON',
      available: function (environment) {
        return environment.Number && typeof environment.Number.EPSILON === 'number';
      },
      works: function (environment) {
        return environment.Number.EPSILON > 0;
      }
    },
    {
      name: 'Math.hypot',
      available: function (environment) {
        return environment.Math && typeof environment.Math.hypot === 'function';
      },
      works: function (environment) {
        return environment.Math.hypot(3, 4) === 5;
      }
    },
    {
      name: 'Math.trunc',
      available: function (environment) {
        return environment.Math && typeof environment.Math.trunc === 'function';
      },
      works: function (environment) {
        return environment.Math.trunc(-1.5) === -1;
      }
    },
    {
      name: 'Math.sign',
      available: function (environment) {
        return environment.Math && typeof environment.Math.sign === 'function';
      },
      works: function (environment) {
        return environment.Math.sign(-2) === -1;
      }
    },
    {
      name: 'Math.sinh',
      available: function (environment) {
        return environment.Math && typeof environment.Math.sinh === 'function';
      },
      works: function (environment) {
        return environment.Math.sinh(0) === 0;
      }
    },
    {
      name: 'Math.cosh',
      available: function (environment) {
        return environment.Math && typeof environment.Math.cosh === 'function';
      },
      works: function (environment) {
        return environment.Math.cosh(0) === 1;
      }
    },
    {
      name: 'Math.atanh',
      available: function (environment) {
        return environment.Math && typeof environment.Math.atanh === 'function';
      },
      works: function (environment) {
        return environment.Math.atanh(0) === 0;
      }
    },
    {
      name: 'Object.freeze',
      available: function (environment) {
        return environment.Object && typeof environment.Object.freeze === 'function';
      },
      works: function (environment) {
        var value = {};
        return environment.Object.freeze(value) === value;
      }
    },
    {
      name: 'Object.entries',
      available: function (environment) {
        return environment.Object && typeof environment.Object.entries === 'function';
      },
      works: function (environment) {
        var value = environment.Object.entries({ orb: 1 });
        return value.length === 1 && value[0][0] === 'orb' && value[0][1] === 1;
      }
    },
    {
      name: 'Object.values',
      available: function (environment) {
        return environment.Object && typeof environment.Object.values === 'function';
      },
      works: function (environment) {
        var value = environment.Object.values({ orb: 1 });
        return value.length === 1 && value[0] === 1;
      }
    },
    {
      name: 'Array.isArray',
      available: function (environment) {
        return environment.Array && typeof environment.Array.isArray === 'function';
      },
      works: function (environment) {
        return environment.Array.isArray([]) && !environment.Array.isArray({});
      }
    },
    {
      name: 'Array.prototype.includes',
      available: function (environment) {
        return environment.Array && environment.Array.prototype
          && typeof environment.Array.prototype.includes === 'function';
      },
      works: function (environment) {
        return environment.Array.prototype.includes.call([1, 2], 2);
      }
    },
    {
      name: 'Array.prototype.flatMap',
      available: function (environment) {
        return environment.Array && environment.Array.prototype
          && typeof environment.Array.prototype.flatMap === 'function';
      },
      works: function (environment) {
        var value = environment.Array.prototype.flatMap.call([1, 2], function (item) {
          return [item, item];
        });
        return value.length === 4 && value[3] === 2;
      }
    },
    {
      name: 'Array.prototype.at',
      available: function (environment) {
        return environment.Array && environment.Array.prototype
          && typeof environment.Array.prototype.at === 'function';
      },
      works: function (environment) {
        return environment.Array.prototype.at.call([1, 2], -1) === 2;
      }
    },
    {
      name: 'String.prototype.padStart',
      available: function (environment) {
        return environment.String && environment.String.prototype
          && typeof environment.String.prototype.padStart === 'function';
      },
      works: function (environment) {
        return environment.String.prototype.padStart.call('1', 2, '0') === '01';
      }
    },
    {
      name: 'Date.prototype.toISOString',
      available: function (environment) {
        return environment.Date && environment.Date.prototype
          && typeof environment.Date.prototype.toISOString === 'function';
      },
      works: function (environment) {
        return new environment.Date(0).toISOString() === '1970-01-01T00:00:00.000Z';
      }
    }
  ];

  function checkCompatibility(environment) {
    var target = environment || getGlobalObject();
    var checked = [];
    var missing = [];
    var failed = [];
    var index;

    for (index = 0; index < FEATURE_TESTS.length; index += 1) {
      var feature = FEATURE_TESTS[index];
      checked.push(feature.name);
      try {
        if (!feature.available(target)) {
          missing.push(feature.name);
        } else if (!feature.works(target)) {
          failed.push(feature.name);
        }
      } catch (error) {
        failed.push(feature.name);
      }
    }

    var supported = missing.length === 0 && failed.length === 0;
    var unavailable = missing.concat(failed);
    return {
      supported: supported,
      baseline: BROWSER_BASELINE,
      scope: 'runtime-builtins',
      syntaxChecked: false,
      checked: checked,
      missing: missing,
      failed: failed,
      message: supported
        ? 'This runtime provides the built-in APIs required by orb.js.'
        : 'This runtime does not provide all built-in APIs required by orb.js: ' + unavailable.join(', ')
    };
  }

  exports.BROWSER_BASELINE = BROWSER_BASELINE;
  exports.checkCompatibility = checkCompatibility;

}));
//# sourceMappingURL=orb-compat.js.map
