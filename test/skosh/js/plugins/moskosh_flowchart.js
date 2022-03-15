var MoSkosh = MoSkosh || {};
MoSkosh.FlowChart = MoSkosh.FlowChart || function () {
  MoSkosh.ScriptLoader([
    "https://cdnjs.cloudflare.com/ajax/libs/raphael/2.2.7/raphael.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/flowchart/1.11.3/flowchart.min.js"
  ]);
}
MoSkosh.FlowChart.prototype = {
  append: function (obj) {
    obj.post_content_load_hook(function (id, content) {
      var unescape_entity = function (str) {
        return str.replace(/&amp;/g, '&')
          .replace(/&gt;/g, '>')
          .replace(/&lt;/g, '<')
          .replace(/&quot;/g, '\"')
          .replace(/&#039;/g, '\'')
      }
      var chart_array = document.getElementsByClassName("language-flowchart")
      for (var num in chart_array) {
        var code_element = chart_array[num];
        var p_node = code_element.parentNode;
        var code = code_element.innerHTML
        var chart_id = "flowchart_" + num;
        var chart_element = document.createElement('div');
        chart_element.setAttribute("id", chart_id)
        chart_element.setAttribute("class", "flowchart")
        if (code) {
          var chart = flowchart.parse(unescape_entity(code))
          var chart_option = {}
          p_node.parentNode.insertBefore(chart_element, p_node);
          p_node.style.display = "none";
          chart.drawSVG(chart_id, chart_option)
        }
      }
    });
  }
}