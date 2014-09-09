'use strict';

var _ = require('lodash');
var stream = require('stream');
var util = require('util');

var Readable = stream.Readable;
util.inherits(LineWrapper, Readable);

function LineWrapper(options) {
    options.objectMode = true;
    Readable.call(this, options);

    var self = this;

    self._source = options.source || process.stdin;
    self._paused = !!(options.paused);

    self._bufferedLines = [];
    self._partialLastLine = '';
    self._immediateHandler = null;
    self._timeoutMillis = options.timeoutMillis || 2;
    self._sourcedEnded = false;
    self._lineCount = 0;

    self._pushIfNotPaused = function() {
        self._immediateHandler = null;

        if (self._paused)
            return;

        if (!self._bufferedLines || self._bufferedLines.length===0) {
            if (self._sourcedEnded) {
                // Note, if _partialLastLine contains text we are dropping it here.
                self.push(null);
            }
            return;
        }

        self._paused = !self.push(self._bufferedLines.shift() + '\n');
        ++self._lineCount;

        if (!self._paused && self._bufferedLines.length>0)
            self._immediateHandler = setImmediate(self._pushIfNotPaused);
    };

    self._source.on('data', function(chunk) {
        if (self._sourcedEnded)
            throw new Error('More data received after end of input!');
        var data = self._partialLastLine + chunk.toString();
        var lines = data.split('\n');
        self._partialLastLine = lines.pop();
        if (lines)
            self._bufferedLines = self._bufferedLines.concat(lines);
        if (!self._immediateHandler)
            self._pushIfNotPaused();
    });

    this._source.on('end', function() {
        self._sourcedEnded = true;
    });
}

// _read will be called when the stream wants to pull more data in
// the advisory size argument is ignored in this case.
LineWrapper.prototype._read = function(size) {
    this._paused = false;
    if (!this._immediateHandler)
        this._pushIfNotPaused();
};

LineWrapper.prototype.pause = function() {
    this._paused = true;
    if (this._immediateHandler) {
        clearImmediate(this._immediateHandler);
        this._immediateHandler = null;
    }
};

LineWrapper.prototype.resume = function() {
    this._read();
};

module.exports = LineWrapper;
