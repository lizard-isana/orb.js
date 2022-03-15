var MoSkosh = MoSkosh || {};
MoSkosh.Chart = MoSkosh.Chart || function () {
  MoSkosh.ScriptLoader([
    "https://cdnjs.cloudflare.com/ajax/libs/c3/0.7.0/c3.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/d3/5.9.2/d3.min.js",
    "https://unpkg.com/json5@^2.0.0/dist/index.min.js"
  ])
  MoSkosh.StyleLoader([
    "https://cdnjs.cloudflare.com/ajax/libs/c3/0.7.0/c3.min.css"
  ])
}
MoSkosh.Chart.prototype = {
  append: function (obj) {
    obj.post_content_load_hook(function (id, content) {

      var chart_array = document.getElementsByClassName("language-chart")
      var code_array = []
      for (var num = 0, ln = chart_array.length; num < ln; num++) {
        var code_element = chart_array[num];
        var p_node = code_element.parentNode;
        try {
          var code = JSON.parse(code_element.innerHTML);
        } catch (e) {
          var code = JSON5.parse(code_element.innerHTML);
          console.log("Using JSON5 https://json5.org/")
        }
        var chart_id = "chart_" + num;
        var chart_element = document.createElement('div');
        chart_element.setAttribute("id", chart_id)
        chart_element.setAttribute("class", "chart")
        chart_element.style.width = "90%";
        chart_element.style.padding = "0";
        chart_element.style.margin = "0";
        p_node.parentNode.insertBefore(chart_element, p_node);
        p_node.style.display = "none";
        code.bindto = "#" + chart_id;
        code_array.push()
        if (code) {
          try {
            var chart = c3.generate(code)
          } catch (e) {
            console.log(e)
          }
        }
      }

    });
  }
}