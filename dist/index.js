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
var isOldNode = parseFloat(process.version.slice(1)) < 6.0;
var SfnMail = isOldNode ? null : require("sfn-mail");
var Logger = /** @class */ (function (_super) {
    tslib_1.__extends(Logger, _super);
    function Logger(arg, action) {
        if (action === void 0) { action = "default"; }
        var _this = this;
        var options;
        if (typeof arg == "string") {
            options = { filename: arg };
        }
        else {
            options = arg;
        }
        _this = _super.call(this, options) || this;
        _this.action = action;
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
        if (cluster.isWorker) {
            // Send the log to the master if in a worker process.
            process.send({
                event: "----sfn-log----",
                level: level,
                msg: msg,
                ttl: this.ttl,
                size: this.size,
                filename: this.filename,
                fileSize: this.fileSize,
                action: this.action,
                mail: this.mail,
            });
        }
        else {
            var _msg = util.format.apply(undefined, msg);
            level = level ? " [" + level + "]" : "";
            _msg = "[" + date() + "]" + level + " " + this.action + " - " + _msg;
            _super.prototype.push.call(this, _msg);
        }
    };
    /** Outputs a message to the log file at LOG level. */
    Logger.prototype.log = function () {
        var msg = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            msg[_i] = arguments[_i];
        }
        return this.push.apply(this, [""].concat(msg));
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
    Logger.Options = Object.assign(OutputBuffer.Options, {
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
    return Logger;
}(OutputBuffer));
// Handle logs when the program runs in multiprocessing env.
if (cluster.isMaster) {
    var loggers_1 = {};
    cluster.on("message", function (worker, log) {
        log = isOldNode ? worker : log; // for nodejs before v6.0
        if (log.event == "----sfn-log----") {
            var level = log.level, msg = log.msg, filename = log.filename, action = log.action;
            if (!loggers_1[filename]) {
                loggers_1[filename] = new Logger(log, action);
            }
            else {
                loggers_1[filename].action = action;
            }
            (_a = loggers_1[filename]).push.apply(_a, [level].concat(msg));
        }
        var _a;
    });
}
module.exports = Logger;
//# sourceMappingURL=index.js.map