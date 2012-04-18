(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['events.tmpl'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, stack2, foundHelper, tmp1, self=this;

function program1(depth0,data) {
  
  
  return "\r\n        <div class=\"notfoundevents\"><p>No events for you</p></div>    \r\n    ";}

  buffer += "<script id=\"tmpl_ownevents\" type=\"text/x-handlebars\">\r\n    ";
  foundHelper = helpers.event;
  stack1 = foundHelper || depth0.event;
  stack2 = helpers.unless;
  tmp1 = self.program(1, program1, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n</script>\r\n";
  return buffer;});
})();