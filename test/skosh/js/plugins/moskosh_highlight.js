var MoSkosh = MoSkosh || {};
MoSkosh.CodeHighlight = MoSkosh.CodeHighlight || function (id, option) {
  MoSkosh.ScriptLoader([
    "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.15.6/highlight.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/highlightjs-line-numbers.js/2.7.0/highlightjs-line-numbers.min.js"
  ])
  MoSkosh.StyleLoader([
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.15.6/styles/github.min.css'
  ])
}

MoSkosh.CodeHighlight.prototype = {
  append: function (obj, option) {
    obj.code_highlight_hook(function (id, code, lang) {
      let highlighted_code
      highlighted_code = hljs.highlightAuto(code, [lang]).value;
      return highlighted_code
    });

    if (option && option.line_number && option.line_number == true) {
      obj.post_content_load_hook(function (id, content) {
        var code_array = document.querySelectorAll(`code[class*="language"]`)
        for (var i in code_array) {
          var class_list = code_array[i].classList;
          if(class_list && class_list.value.match(/language/)){
            var lang = class_list.value.match(/(|\s)language-(.*)(|\s)/)[2];
            code_array[i].setAttribute("data-language",lang);
          }
          if (code_array[i].parentNode) {
            code_array[i].parentNode.classList.add("code")
          }
          hljs.lineNumbersBlock(code_array[i]);
        }
      })
    }
  }
}