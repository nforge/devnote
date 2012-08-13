// Directed Graph
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var async = require('async');
var _ = require('underscore');

var Node = function() {};

Node.prototype.getOutgoings = function() {
    throw new Error("Not Implemented: " + this + ".getOutgoings()");
}

Node.prototype.isVisited = function() {
    throw new Error("Not Implemented: " + this + ".isVisited()");
}

Node.prototype.setVisited = function(bool) {
    throw new Error("Not Implemented: " + this + ".setVisited()");
}

var Graph = function(head) {
    var self = this;

    self.head = head;
    self.walkerCount = 1;

    self.on('term', function(prev, curr) {
        self.walkerCount -= 1;

        if (self.walkerCount == 0) {
            return self.emit('end', prev, curr);
        }
    });
};

util.inherits(Graph, EventEmitter);

var markIncomings = function(from, callback) {
    from.getOutgoings(function(err, nodes) {
        if (err) return callback(err);
        async.forEach(nodes, function(to, cb) {
            if (to.incomings) {
                to.incomings.push(from);
            } else {
                to.incomings = [from];
            }
            markIncomings(to, cb);
        }, function(err) {
            return callback(err);
        });
    });
}

var unmarkIncomings = function(from, callback) {
    var thisList = [];
    from.getOutgoings(function(err, nodes) {
        if (err) return callback(err);
        async.map(nodes, function(to, cb) {
            to.incomings = _.without(to.incomings, from);
            if (to.incomings.length == 0) {
                thisList.push(to);
            }
            unmarkIncomings(to, cb);
        }, function(err, results) {
            if (err) return callback(err);
            callback(null, thisList.concat(results.reduce(function(a, b) {
                return a.concat(b);
            }, [])));
        });
    });
}

// topological sort
Graph.prototype.sort = function(callback) {
    var self = this;
    // 1. mark incomings
    markIncomings(self.head, function(err) {
        if (err) return callback(err);
        // 2. sort as a list
        unmarkIncomings(self.head, function(err, list) {
            self.sortedList = [self.head].concat(list)
            callback(err, self.sortedList);
        });
    });
}

Graph.prototype.walkSortedList = function() {
    var prev = null, self = this;
    self.sortedList.forEach(function(item) {
        self.emit('visit', prev, item);
        prev = item;
    });
    self.emit('end');
}

Graph.prototype.walkUnsortedGraph = function(prev, curr) {
    var self = this;

    if (curr.isVisited()) {
        return self.emit('term', prev, curr);
    } else {
        curr.setVisited(true);
    }

    self.emit('visit', prev, curr);

    curr.getOutgoings(function(err, outgoings) {
        if (outgoings.length <= 0) {
            return self.emit('term', prev, curr);
        }

        self.walkerCount += outgoings.length - 1;

        for (var index in outgoings) {
            self.walkUnsortedGraph(curr, outgoings[index]);
        }
    });
}

Graph.prototype.walk = function() {
    var self = this;

    if (self.sortedList) {
      // visiting order is guaranteed.
      return self.walkSortedList();
    } else {
      // visiting order is not guaranteed.
      return self.walkUnsortedGraph(null, self.head);
    }
}

exports.Graph = Graph;
exports.Node = Node;
