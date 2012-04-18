Ember.js consists of several packages:
--------------------

ember-metal
ember-runtime
ember-views
ember-handlebars
It also has a couple bundled dependencies:

Handlebars
Metamorph
Metal consists of several foundation technologies: observers, bindings, computed properties, and a run loop.

Runtime provides the Ember object system along with a handful of useful classes. The object system is built with many of the foundational technologies implemented in metal, but exposes them in a much cleaner way to the application developer.

The ember-views package is pretty self-explanatory, it's the Ember view system built on top of the runtime. On top of that, is the ember-handlebars package which depends on ember-views to provide auto-updating templates on top of the Handlebars templating system.

For more info on Handlebars, check out the Handlebars website.

Metamorph is a small library written by Yehuda and Tom which provides Ember with the ability to update specific portions of the DOM, which enables Ember's DOM binding functionality.