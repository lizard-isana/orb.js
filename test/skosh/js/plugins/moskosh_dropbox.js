//moskosh_dropbox.js
var MoSkosh = MoSkosh || {};
MoSkosh.DropboxLoader = MoSkosh.DropBoxLoader || function (param) {
  MoSkosh.ScriptLoader([
    "https://unpkg.com/axios/dist/axios.min.js"
  ])
  this.cdn = param;
}
MoSkosh.DropboxLoader.prototype = {
  append:function(obj){
    obj.cdn = this.cdn;
    obj.post_initialize_hook(function(){
      obj.set_option({cdn:obj.cdn})
    })   
  }
}