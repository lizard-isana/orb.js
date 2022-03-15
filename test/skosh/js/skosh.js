"use strict";

/*! Skosh https://gitlab.com/isnksw/skosh @license MIT */
// name space for main script
var Ato = Ato || {}; // name space for plugins

var MoSkosh = MoSkosh || {};
MoSkosh.LoadedScripts = [];

MoSkosh.ScriptLoader = function (scripts, callback) {
  var len = scripts.length;
  var i = 0;
  function AppendScript() {
    if (MoSkosh.LoadedScripts.indexOf(scripts[i]) < 0 && scripts[i] !== undefined) {
      var script = document.createElement("script");
      script.src = scripts[i];
      document.getElementsByTagName("head")[0].appendChild(script);
      MoSkosh.LoadedScripts.push(scripts[i]);
      i++;
      if (i == len) {
        if (callback) {
          script.onload = callback;
        }
        return;
      }
      script.onload = AppendScript;
    } else if (scripts[i] == undefined && i != len) {
      i++;
      AppendScript();
    } else {
      return;
    }
  }
  AppendScript();
};

MoSkosh.StyleLoader = function (styles) {
  var len = styles.length;
  var i = 0;
  function AppendStyle() {
    var link = document.createElement("link");
    link.href = styles[i];
    link.rel = "stylesheet";
    document.getElementsByTagName("head")[0].appendChild(link);
    i++;
    if (i < len) {
      link.onload = AppendStyle;
    }
  }
  AppendStyle();
};

MoSkosh.EscapeEntity = function (str) {
  return str.replace(/&/g, '&amp;')
    .replace(/>/g, '&gt;')
    .replace(/</g, '&lt;')
    .replace(/\"/g, '&quot;')
    .replace(/\'/g, '&#039;')
}

MoSkosh.UnescapeEntity = function (str) {
  return str.replace(/&amp;/g, '&')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&quot;/g, '\"')
    .replace(/&#039;/g, '\'')
}

var scripts = [
  "./skosh/js/vendor/markdown-it.js",
  "./skosh/js/vendor/purify.js",
  "./skosh/js/vendor/markdown-it-task-lists.js",
  "./skosh/js/vendor/markdown-it-footnote.js",
  "./skosh/js/vendor/markdown-it-attrs.browser.js"
];
MoSkosh.ScriptLoader(scripts);

Ato.Storage = {};
Ato.Storage.loaded_page_num = Ato.Storage.loaded_page_num || 0;
Ato.Storage.GlobalPageLoadHook = [];

MoSkosh.DataLoader = function (option) {
  var XMLhttpObject;

  var createXMLhttpObject = function createXMLhttpObject() {
    XMLhttpObject = false;

    if (window.XMLHttpRequest) {
      XMLhttpObject = new XMLHttpRequest();
    } else if (window.ActiveXObject) {
      try {
        XMLhttpObject = new ActiveXObject("Msxml2.XMLHTTP");
      } catch (e) {
        if (console) {
          console.log(e);
        }

        XMLhttpObject = new ActiveXObject("Microsoft.XMLHTTP");
      }
    }

    return XMLhttpObject;
  };

  var Loader = function Loader(option) {
    XMLhttpObject = createXMLhttpObject();

    if (!XMLhttpObject) {
      return;
    }

    XMLhttpObject.open("GET", option.path, option.ajax);
    XMLhttpObject.send(null);

    if (option.ajax == false) {
      try {
        if (option.format === "json") {
          var data = JSON.parse(XMLhttpObject.responseText);
        } else {
          var data = XMLhttpObject.responseText;
        }

        if (option.callback !== undefined) {
          option.callback(data, option.id);
        } else {
          return data;
        }
      } catch (e) {
        if (console) {
          console.log(e);
        }

        return;
      }
    } else {
      try {
        XMLhttpObject.onreadystatechange = function () {
          if (XMLhttpObject.readyState == 4) {
            if (XMLhttpObject.status == 200) {
              if (option.format === "json") {
                var data = JSON.parse(XMLhttpObject.responseText);
              } else {
                var data = XMLhttpObject.responseText;
              }

              if (option.callback) {
                option.callback(data, option.id);
              } else {
                return data;
              }
            }
          } else {
            return;
          }
        };
      } catch (e) {
        if (console) {
          console.log(e);
        }

        return;
      }
    }
  };

  return Loader(option);
};

Ato.QueryDecoder = function () {
  var query = [];
  var search = decodeURIComponent(location.search);
  var q = search.replace(/^\?/, "&").split("&");

  for (var i = 1, l = q.length; i < l; i++) {
    var tmp_array = q[i].split("=");
    var name = MoSkosh.EscapeEntity(tmp_array[0]);
    var value = MoSkosh.EscapeEntity(tmp_array[1]);

    if (value === "true") {
      value = true;
    } else if (value === "false") {
      value = false;
    }

    query[name] = value;
  }

  return query;
};

Ato.Skosh =
  Ato.Skosh ||
  function (id, option) {
    var Storage = {};
    Storage.option = {};
    var ResourceLoader = function ResourceLoader(array, storage, _callback) {
      Storage.loaded_data_num = 0;
      var length = array.length;
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;
      try {
        for (
          var _iterator = array[Symbol.iterator](), _step;
          !(_iteratorNormalCompletion = (_step = _iterator.next()).done);
          _iteratorNormalCompletion = true
        ) {
          var value = _step.value;
          var loader = new MoSkosh.DataLoader({
            format: "text",
            path: value + "?nocache=" + new Date().getTime(),
            id: value,
            ajax: true,
            // or "false"
            callback: function callback(data, id) {
              storage[id] = data;
              var catcher = new ResourceCatcher(length, _callback);
            }
          });
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return != null) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    };

    var ResourceCatcher = function ResourceCatcher(length, callback) {
      Storage.loaded_data_num += 1;

      if (Storage.loaded_data_num == length) {
        callback();
      }
    };

    var DropBox = function DropBox(array, storage, callback){
      array.forEach(function(value){
        axios({
          method: 'post',
          url: 'https://content.dropboxapi.com/2/files/download',
          headers: {
            'Authorization': 'Bearer ' + Storage.option.cdn.access_token,
            'Content-Type': 'application/octet-stream',
            'Dropbox-API-Arg': JSON.stringify({
              "path":"/" + value})
          }
        })
        .then(response => {
          storage[value] = response.data
          callback();
        })
        .catch(error => {
          console.log(error)
        })
        .then(() => {
          return
        })
      })
    }

    var ContentLoaded = function ContentLoaded(data) {
      var page_content = [];
      var content_list = Storage.content_list;
      for (var _value in content_list) {
        var content = content_list[_value];
        page_content.push(Storage.contents[content]);
      }

      var merged_page_content = page_content.join("\n");
      if (Storage.PreRenderingHook.length > 0) {
        for (var _i in Storage.PreRenderingHook) {
          merged_page_content = Storage.PreRenderingHook[_i](
            Storage.element_id,
            merged_page_content
          );
        }
      }

      if (Storage.format == "raw") {
        document.getElementById(
          Storage.element_id
        ).innerHTML = merged_page_content;
      } else {
        var marked_page_content = Storage.Renderer.render(
          merged_page_content
        );
        if (Storage.sanitize == true) {
          marked_page_content = DOMPurify.sanitize(marked_page_content);
        };

        if (Storage.PostRenderingHook.length > 0) {
          for (var _i2 in Storage.PostRenderingHook) {
            marked_page_content = Storage.PostRenderingHook[_i2](
              Storage.element_id,
              marked_page_content
            );
          }
        }
        let dom = document.createRange().createContextualFragment(marked_page_content);
        document.getElementById(Storage.element_id).appendChild(dom);
        //document.getElementById(Storage.element_id).innerHTML = marked_page_content;
        var loaded_content = document.getElementById(Storage.element_id);
        var link = loaded_content.querySelectorAll("a");

        for (var i = 0, ln = link.length; i < ln; i++) {
          var href = link[i].getAttribute("href");

          if (
            href.match(/^(?!http(|s)).*/) &&
            href.match(/^(?!\#).*/) &&
            href.match(/^(?!.*(\/|=)).*/)
          ) {
            link[i].href = "?" + Storage.link_target + "=" + href;
          }
        }
      }

      if (Storage.PostContentLoadHook.length > 0) {
        for (var _i3 in Storage.PostContentLoadHook) {
          Storage.PostContentLoadHook[_i3](
            Storage.element_id,
            marked_page_content
          );
        }
      }

      Ato.Storage.display_page_num = Ato.Storage.display_page_num || 0;
      Ato.Storage.display_page_num++;

      if (Ato.Storage.display_page_num == Ato.Storage.loaded_page_num) {
        for (var _i4 in Ato.Storage.GlobalPageLoadHook) {
          Ato.Storage.GlobalPageLoadHook[_i4]();
        }
      }
    }

    var Initialize = function Initialize(option) {
      Storage.option.cdn = false;
      Storage.format = "markdown";
      Storage.permit_query = true;
      Storage.query_path = "./";
      Storage.element_id = id;
      Storage.link_target = id;
      Storage.html = true;
      Storage.sanitize = true;
      Storage.allowed_attributes = ['id', 'class', 'style'];
      if (option) {
        if (option.format) {
          Storage.format = format;
        }
        if (option.html && option.html == "false") {
          Storage.html = false;
        }
        if (option.sanitize && option.sanitize == "false") {
          Storage.sanitize = false;
        }
        if (option.query) {
          Storage.permit_query = option.query;

          if (option.query_path) {
            Storage.query_path = option.query_path;
          }
        }
        if (option.allowed_attributes) {
          Storage.allowed_attributes = option.allowed_attributes;
        }
        if (option.link_target) {
          Storage.link_target = option.link_target;
        }
        if (option.cdn) {
          Storage.option.cdn = option.cdn;
        }
      }
      Storage.Renderer = window
        .markdownit({
          html: Storage.html,
          breaks: true,
          linkify: true,
          typographer: true,
          highlight: function highlight(code, lang) {
            if (Storage.CodeHighlightHook.length > 0) {
              for (var i in Storage.CodeHighlightHook) {
                code = Storage.CodeHighlightHook[i](
                  Storage.element_id,
                  code,
                  lang
                );
              }
            }
            return code;
          }
        })
        .use(markdownitFootnote)
        .use(markdownitTaskLists);

      Storage.Renderer.linkify.set({
        fuzzyLink: false
      });

      Storage.Renderer.use(markdownItAttrs, {
        allowedAttributes: Storage.allowed_attributes
      });
    };


    Storage.PostInitializeHook = [];

    this.add_post_initialize_hook = function (f) {
      Storage.PostInitializeHook.push(f);
    };

    Storage.PreRenderingHook = [];

    this.add_pre_rendering_hook = function (f) {
      Storage.PreRenderingHook.push(f);
    };

    Storage.CodeHighlightHook = [];

    this.add_code_highlight_hook = function (f) {
      Storage.CodeHighlightHook.push(f);
    };

    Storage.PostRenderingHook = [];

    this.add_post_rendering_hook = function (f) {
      Storage.PostRenderingHook.push(f);
    };

    Storage.PostContentLoadHook = [];

    this.add_post_content_load_hook = function (f) {
      Storage.PostContentLoadHook.push(f);
    };

    this.add_post_page_load_hook = function (f) {
      Ato.Storage.GlobalPageLoadHook.push(f);
    };

    this.id = id;

    this.load_page = function (list) {
      var query = Ato.QueryDecoder();
      Storage.contents = {};
      Storage.content_list = [];

      if (Object.keys(query).length > 0) {
        for (var key in query) {
          if (key == Storage.element_id) {
            Storage.content_list = [];
            var tmp = query[key].split(",");

            for (var value in tmp) {
              var target = tmp[value].split("/").reverse()[0];
              Storage.content_list.push(target);
            }
          } else {
            Storage.content_list = list;
          }
        }
      } else {
        Storage.content_list = list;
      }

      Ato.Storage.loaded_page_num += Storage.content_list.length;
      if (Storage.content_list.length > 0) {
        if(Storage.option.cdn == false){
          var loader = new ResourceLoader(
            Storage.content_list,
            Storage.contents,
            function (data) {
              ContentLoaded(data)
            }
          );
        }else{
          if(Storage.option.cdn.server == "dropbox"){
            DropBox(
              Storage.content_list,
              Storage.contents,
              function () {
                ContentLoaded()
              }
            )
          }
        }
      }
    }
    Initialize(option);
    this.option = Storage.option
    this.renderer = Storage.Renderer;
  };

Ato.Skosh.prototype = {
  set_option:function set_option(option){
    for (var v in option){
      this.option[v] = option[v]
    }
  },
  post_initialize_hook:function post_initialize_hook(f){
    f();
  },
  data_load_hook:function data_load_hook(f){
    this.data_load_hook(f);
  },
  pre_rendering_hook: function pre_rendering_hook(f) {
    this.add_pre_rendering_hook(f);
  },
  code_highlight_hook: function code_highlight_hook(f) {
    this.add_code_highlight_hook(f);
  },
  post_rendering_hook: function post_rendering_hook(f) {
    this.add_post_rendering_hook(f);
  },
  post_content_load_hook: function post_content_load_hook(f) {
    this.add_post_content_load_hook(f);
  },
  post_page_load_hook: function post_page_load_hook(f) {
    this.add_post_page_load_hook(f);
  },
  load: function load(param) {
    if (Array.isArray(param)) {
      var content_list = param;
    } else if (typeof param == "string") {
      var content_list = [param];
    } else {
      var content_list = ["index.md"];
    }
    this.load_page(content_list);
  }
};
var Skosh = Ato.Skosh;
