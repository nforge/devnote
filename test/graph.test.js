var libpath = process.env['LIB_COV'] ? 'lib-cov' : 'lib';
var assert = require('assert');
var Graph = require('../' + libpath + '/graph').Graph;
var Node = require('../' + libpath + '/graph').Node;
var util = require('util');

suite('graph.walk', function() {
    var MyNode = function(name) {
        var self = this;
        this.nexts = [];

        this.toString = function() {
            return name;
        }

        this.getOutgoings = function(callback) {
            callback(null, self.nexts);
        }

        this.setVisited = function(bool) {
            self._isVisited = bool;
        }

        this.isVisited = function() {
            return self._isVisited;
        }
    };

    util.inherits(MyNode, Node);

    setup(function(done) {
        done();
    });

    test('linked list', function(done) {
        // given
        var first = new MyNode('first');
        var second = new MyNode('second');
        var visitedNodes = [];

        first.nexts.push(second);

        var graph = new Graph(first);

        assert.ok(graph.walk);

        // when and done
        graph.on('visit', function(prev, curr) {
            visitedNodes.push(curr);
        });

        graph.on('end', function() {
            assert.equal(visitedNodes[0], first);
            assert.equal(visitedNodes[1], second);
            done();
        });

        graph.walk();
    });

    test('unsorted graph', function(done) {
        // given:
        // head
        //  / \
        //  a c
        //  | |
        //  b d
        //  \ /
        //  tail
        //
        //  order:
        //  head, a, b, c, d, tail
        //  head, c, d, a, b, tail
        var head = new MyNode('head');
        var a = new MyNode('a');
        var b = new MyNode('b');
        var c = new MyNode('c');
        var d = new MyNode('d');
        var tail = new MyNode('tail');
        var visitedNodes = [];

        head.nexts.push(a);
        head.nexts.push(c);
        a.nexts.push(b);
        c.nexts.push(d);
        b.nexts.push(tail);
        d.nexts.push(tail);

        var graph = new Graph(head);

        // when and done
        graph.on('visit', function(prev, curr) {
            visitedNodes.push(curr);
        });

        graph.on('end', function() {
            assert.equal(visitedNodes.length, 6);
            assert.ok(visitedNodes.indexOf(head) == 0);
            assert.ok(visitedNodes.indexOf(a) > 0);
            assert.ok(visitedNodes.indexOf(c) > 0);
            assert.ok(visitedNodes.indexOf(d) > 0);
            assert.ok(visitedNodes.indexOf(b) > 0);
            assert.ok(visitedNodes.indexOf(tail) > 0);
            done();
        });

        graph.walk();
    });

    test('topological sort', function(done) {
        // given:
        // head
        //  / \
        //  a c
        //  | |
        //  b d
        //  \ /
        //  tail
        //
        //  order:
        //  head, a, b, c, d, tail
        //  head, c, d, a, b, tail
        var head = new MyNode('head');
        var a = new MyNode('a');
        var b = new MyNode('b');
        var c = new MyNode('c');
        var d = new MyNode('d');
        var tail = new MyNode('tail');
        var visitedNodes = [];

        head.nexts.push(a);
        head.nexts.push(c);
        a.nexts.push(b);
        c.nexts.push(d);
        b.nexts.push(tail);
        d.nexts.push(tail);

        var graph = new Graph(head);

        // when and done
        graph.on('visit', function(prev, curr) {
            visitedNodes.push(curr);
        });

        graph.on('end', function() {
            assert.equal(visitedNodes.length, 6);
            assert.ok(visitedNodes.indexOf(head) == 0);
            assert.ok(visitedNodes.indexOf(a) > visitedNodes.indexOf(head));
            assert.ok(visitedNodes.indexOf(c) > visitedNodes.indexOf(head));
            assert.ok(visitedNodes.indexOf(d) > visitedNodes.indexOf(c));
            assert.ok(visitedNodes.indexOf(b) > visitedNodes.indexOf(a));
            assert.ok(visitedNodes.indexOf(tail) == 5);
            done();
        });

        graph.sort(function(err) {
            graph.walk();
        });
    });

    teardown(function(done) {
        done();
    });

    test('two starting points', function(done) {
        // given:
        // head
        //  / \
        //  a c
        //  | 
        //  b d
        //  \ /
        //  tail
        //
        //  order:
        //  head, a, b, c, tail
        //  head, c, a, b, tail
        var head = new MyNode('head');
        var a = new MyNode('a');
        var b = new MyNode('b');
        var c = new MyNode('c');
        var d = new MyNode('d');
        var tail = new MyNode('tail');
        var visitedNodes = [];

        head.nexts.push(a);
        head.nexts.push(c);
        a.nexts.push(b);
        b.nexts.push(tail);
        d.nexts.push(tail);

        var graph = new Graph(head);

        // when and done
        graph.on('visit', function(prev, curr) {
            visitedNodes.push(curr);
        });

        graph.on('end', function() {
            assert.equal(visitedNodes.length, 5);
            assert.ok(visitedNodes.indexOf(head) == 0);
            assert.ok(visitedNodes.indexOf(a) > visitedNodes.indexOf(head));
            assert.ok(visitedNodes.indexOf(c) > visitedNodes.indexOf(head));
            assert.ok(visitedNodes.indexOf(b) > visitedNodes.indexOf(a));
            assert.ok(visitedNodes.indexOf(tail) == 4);
            done();
        });

        graph.sort(function(err) {
            graph.walk();
        });
    });

    teardown(function(done) {
        done();
    });

});
