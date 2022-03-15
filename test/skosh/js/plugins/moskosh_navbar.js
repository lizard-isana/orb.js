var MoSkosh = MoSkosh || {};
MoSkosh.NavBar = MoSkosh.NavBar || function () { }

MoSkosh.NavBar.prototype = {
  append: function (obj) {
    obj.menu_target = this.target;
    obj.post_content_load_hook(function (id, contents) {
      const wrapper = document.getElementById(id);
      const div = document.createElement("div");
      div.setAttribute("id", "menu_icon");
      div.innerHTML = '<svg height="32.482025px" viewBox="0 0 32.482018 32.482025" width="32.482018px" xmlns="http://www.w3.org/2000/svg"><g style="fill:#bbb;stroke:#bbb;stroke-width:1.0;stroke-linecap:round;stroke-linejoin:round;"><rect height="1.296691" rx=".375946" width="23.408298" x="5.037515" y="6.9073"/><rect height="1.296691" rx=".375946" width="23.4083" x="5.037511" y="15.63461"/><rect height="1.296691" rx=".375946" width="23.408302" x="5.037511" y="24.36193"/></g></svg>';
      wrapper.appendChild(div);
      const menu_target = document.getElementById("menu_icon");
      menu_target.addEventListener('click', function (e) {
        let menu_items = wrapper.querySelectorAll("ul");
        for (let i = 0, ln = menu_items.length; i < ln; i++) {
          let target = menu_items[i];
          if (target.style.display == "block") {
            target.style.display = "none";
          } else {
            target.style.display = "block";
          }
        }
      })
    })
  }
}
