// # test.js

'use strict';

require('./support/config');

var from = require('from');
var concat = require('concat-stream');
var _ = require('lodash');

describe('LineWrapper', function() {
    var LineWrapper = require('../lib/linewrapper');

    it('should process an empty stream', function(done) {
        var lines = [];
        var input = from(lines.slice());

        var mainOut = concat({encoding: 'string'}, function(data) {
            var expected = '';
            expect(data).to.deep.equal(expected);
            done();
        });

        var linewrapper = new LineWrapper({ source: input });

        input.pipe(mainOut);
    });

    it('should process one line of text', function(done) {
        var lines = ['Hello world\n'];
        var input = from(lines.slice());

        var mainOut = concat({encoding: 'string'}, function(data) {
            var expected = lines.join('');
            expect(data).to.deep.equal(expected);
            expect(linewrapper._lineCount).to.equal(1);
            done();
        });

        var linewrapper = new LineWrapper({ source: input });

        input.pipe(mainOut);
    });

    it('should process two lines of text', function(done) {
        var lines = ['Hello world\n', 'Goodbye Jim\n'];
        var input = from(lines.slice());

        var mainOut = concat({encoding: 'string'}, function(data) {
            var expected = lines.join('');
            expect(data).to.deep.equal(expected);
            expect(linewrapper._lineCount).to.equal(2);
            done();
        });

        var linewrapper = new LineWrapper({ source: input });

        input.pipe(mainOut);
    });

    function reGroup(partialLines) {
        var text = partialLines.join('');
        var lines = text.split('\n');
        lines.pop();
        return _.map(lines, function(line) { return line + '\n'; });
    }

    it('should handle partial lines of text', function(done) {
        this.timeout(5000); // excessive timeout needed for Travis. Not sure why.
        var lines = ['Hello ', 'world\n', 'Good', 'bye Jim\n'];
        var input = from(lines.slice());

        var expected = reGroup(lines);

        var linewrapper = new LineWrapper({ source: input, paused: true });

        var received = [];
        linewrapper.on('data', function(chunk) {
            var line = chunk.toString();
            received.push(line);
        });

        linewrapper.on('end', function() {
            expect(linewrapper._sourcedEnded).to.equal(true);
            expect(linewrapper._lineCount).to.equal(2);
            expect(received).to.deep.equal(expected);
            done();
        });

        input.resume();
    });

    it('should handle partial lines of text and drop last fragment', function(done) {
        this.timeout(5000); // excessive timeout needed for Travis. Not sure why.
        var lines = ['Hello ', 'world\n', 'Good', 'bye Jim\n', 'foo'];
        var input = from(lines.slice());

        var expected = reGroup(lines);

        var linewrapper = new LineWrapper({ source: input, paused: true });

        var received = [];
        linewrapper.on('data', function(chunk) {
            var line = chunk.toString();
            received.push(line);
        });

        linewrapper.on('end', function() {
            expect(linewrapper._sourcedEnded).to.equal(true);
            expect(linewrapper._lineCount).to.equal(2);
            expect(received).to.deep.equal(expected);
            done();
        });

        input.resume();
    });

    it('should handle pause and resume', function(done) {
        this.timeout(5000);
        var lines = ['1\n', '2\n', '3\n', '4\n', '5\n', '6\n', '7\n'];
        var input = from(lines.slice());

        var expected = reGroup(lines);

        var linewrapper = new LineWrapper({ source: input, paused: true, timeoutMillis: 100 });

        var received = [];
        linewrapper.on('data', function(chunk) {
            var line = chunk.toString();
            received.push(line);

            if ((received.length % 3) === 2) {
                linewrapper.pause();
                setTimeout(function () {
                    linewrapper.resume();
                }, 100);
            }
        });

        linewrapper.on('end', function() {
            expect(linewrapper._sourcedEnded).to.equal(true);
            expect(linewrapper._lineCount).to.equal(7);
            expect(received).to.deep.equal(expected);
            done();
        });

        input.resume();
    });

});
