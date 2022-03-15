var MoSkosh = MoSkosh || {};
MoSkosh.Diagram = MoSkosh.Diagram || function () {
  MoSkosh.ScriptLoader([
    "https://cdnjs.cloudflare.com/ajax/libs/webfont/1.6.28/webfontloader.js",
    "https://cdnjs.cloudflare.com/ajax/libs/snap.svg/0.5.1/snap.svg-min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.9.1/underscore-min.js",
    "https://cdn.jsdelivr.net/npm/@rokt33r/js-sequence-diagrams@2.0.6-2/dist/sequence-diagram-min.js"
  ])
}

MoSkosh.Diagram.prototype = {
  append: function (obj) {
    obj.post_content_load_hook(function (id, content) {
      try {
        var unescape_entity = function (str) {
          return str.replace(/&amp;/g, '&')
            .replace(/&gt;/g, '>')
            .replace(/&lt;/g, '<')
            .replace(/&quot;/g, '\"')
            .replace(/&#039;/g, '\'')
        }
        var diagram_array = document.getElementsByClassName("language-diagram")
        for (var num in diagram_array) {
          var code_element = diagram_array[num];
          var p_node = code_element.parentNode;
          var code = code_element.innerHTML
          var diagram_id = "diagram_" + num;
          var diagram_element = document.createElement('div');
          diagram_element.setAttribute("id", diagram_id)
          diagram_element.setAttribute("class", "diagram")
          if (code) {
            var diagram = Diagram.parse(unescape_entity(code))
            var diagram_option = { theme: 'simple' }
            p_node.parentNode.insertBefore(diagram_element, p_node);
            p_node.style.display = "none";
            diagram.drawSVG(diagram_id, diagram_option)
          }
        }
      } catch (e) {
        console.log(e);
      }
    });
  }
}