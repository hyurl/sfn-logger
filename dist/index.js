"use strict";
var tslib_1 = require("tslib");
var cluster = require("cluster");
var path = require("path");
var zlib = require("zlib");
var util = require("util");
var fs = require("fs");
var OutputBuffer = require("sfn-output-buffer");
var date = require("sfn-date");
var ideal_filename_1 = require("ideal-filename");
var mkdir = require("mkdirp");
var trimLeft = require("lodash/trimStart");
var isOldNode = parseFloat(process.version.slice(1)) < 6.0;
var SfnMail = isOldNode ? null : require("sfn-mail");
var Levels;
(function (Levels) {
    Levels[Levels["LOG"] = 0] = "LOG";
    Levels[Levels["INFO"] = 1] = "INFO";
    Levels[Levels["WARN"] = 2] = "WARN";
    Levels[Levels["ERROR"] = 3] = "ERROR";
})(Levels || (Levels = {}));
var Logger = /** @class */ (function (_super) {
    tslib_1.__extends(Logger, _super);
    function Logger(arg, action) {
        var _this = this;
        var options;
        if (typeof arg == "string") {
            options = { filename: arg };
        }
        else {
            options = arg;
        }
        _this = _super.call(this, options) || this;
        _this.action = action || options.action;
        if (typeof SfnMail == "function") {
            if (options.mail instanceof SfnMail) {
                _this.mailer = options.mail;
                _this.mail = options.mail["options"];
            }
            else if (typeof options.mail == "object") {
                _this.mailer = new SfnMail(options.mail);
            }
        }
        return _this;
    }
    /** Pushes a message to the log file. */
    Logger.prototype.push = function (level) {
        var msg = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            msg[_i - 1] = arguments[_i];
        }
        if (Levels[level] < Levels[this.constructor["outputLevel"].toUpperCase()])
            return void 0;
        var _msg = util.format.apply(undefined, msg), action = this.action ? " [" + this.action + "]" : "";
        if (this.trace) {
            var target = {};
            Error.captureStackTrace(target);
            action += " [" + trimLeft(target.stack.split("\n")[3]).slice(3) + "]";
        }
        level = level && level != "LOG" ? " [" + level + "]" : "";
        _msg = "[" + date() + "]" + level + action + " - " + _msg;
        if (cluster.isWorker) {
            // Send the log to the master if in a worker process.
            process.send({
                event: "----sfn-log----",
                msg: _msg,
                ttl: this.ttl,
                size: this.size,
                filename: this.filename,
                fileSize: this.fileSize,
                mail: this.mail,
            });
        }
        else {
            _super.prototype.push.call(this, _msg);
        }
    };
    /** Outputs a message to the log file at LOG level. */
    Logger.prototype.log = function () {
        var msg = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            msg[_i] = arguments[_i];
        }
        return this.push.apply(this, ["LOG"].concat(msg));
    };
    /** Outputs a message to the log file at INFO level. */
    Logger.prototype.info = function () {
        var msg = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            msg[_i] = arguments[_i];
        }
        return this.push.apply(this, ["INFO"].concat(msg));
    };
    /** Outputs a message to the log file at WARN level. */
    Logger.prototype.warn = function () {
        var msg = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            msg[_i] = arguments[_i];
        }
        return this.push.apply(this, ["WARN"].concat(msg));
    };
    /** Outputs a message to the log file at ERROR level. */
    Logger.prototype.error = function () {
        var msg = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            msg[_i] = arguments[_i];
        }
        return this.push.apply(this, ["ERROR"].concat(msg));
    };
    /** Sets the lowest level of logs that should output. */
    Logger.outputLevel = "LOG";
    return Logger;
}(OutputBuffer));
(function (Logger) {
    Logger.Options = Object.assign({}, OutputBuffer.Options, {
        trace: false,
        limitHandler: function (filename, data, next) {
            var _this = this;
            var $this = this;
            if ($this.mail) { // Send old logs as email to the receiver.
                if (!$this.mailer["message"].text)
                    $this.mailer.text("Please review the attachment.");
                if (!$this.mailer["message"].html)
                    $this.mailer.html("<p>Please review the attachment.</p>");
                // reset attachments.
                $this.mailer["message"].attachments = [];
                $this.mailer.attachment(filename).send().then(function () {
                    next();
                }).catch(function (err) {
                    $this.error(err);
                    next();
                });
            }
            else { // compress old logs
                var dir_1 = path.dirname(filename) + ("/" + date("Y-m-d") + "/"), basename_1 = path.basename(filename);
                new Promise(function (resolve, reject) {
                    fs.exists(dir_1, function (exists) {
                        if (exists) {
                            resolve(dir_1);
                        }
                        else {
                            mkdir(dir_1, function (err) {
                                err ? reject(err) : resolve(dir_1);
                            });
                        }
                    });
                }).then(function () {
                    return ideal_filename_1.default("" + dir_1 + basename_1 + ".gz", ".log.gz");
                }).then(function (gzName) {
                    // compress to Gzip.
                    var gzip = zlib.createGzip(), input = fs.createReadStream(filename), output = fs.createWriteStream(gzName);
                    input.pipe(gzip).pipe(output);
                    output.on("close", function () { return next(); });
                }).catch(function (err) {
                    _this.error(err);
                    next();
                });
            }
        },
        errorHandler: function (err) {
            this.error(err);
        }
    });
})(Logger || (Logger = {}));
// Handle logs when the program runs in multiprocessing env.
if (cluster.isMaster) {
    var loggers_1 = {};
    cluster.on("message", function (worker, log) {
        log = isOldNode ? worker : log; // for nodejs before v6.0
        if (log.event == "----sfn-log----") {
            var msg = log.msg, filename = log.filename;
            if (!loggers_1[filename]) {
                loggers_1[filename] = new Logger(log);
            }
            OutputBuffer.prototype.push.call(loggers_1[filename], msg);
        }
    });
}
module.exports = Logger;
//# sourceMappingURL=index.js.map