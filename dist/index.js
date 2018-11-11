"use strict";
const path = require("path");
const zlib = require("zlib");
const util = require("util");
const fs = require("fs-extra");
const OutputBuffer = require("sfn-output-buffer");
const Mail = require("sfn-mail");
const moment = require("moment");
const ideal_filename_1 = require("ideal-filename");
const trimLeft = require("lodash/trimStart");
class Logger extends OutputBuffer {
    constructor(arg, action) {
        let options;
        if (typeof arg == "string") {
            options = { filename: arg };
        }
        else {
            options = arg;
        }
        super(options);
        this.action = action || options.action;
        if (options.mail instanceof Mail) {
            this.mailer = options.mail;
            this.mail = options.mail["options"];
        }
        else if (typeof options.mail == "object") {
            this.mailer = new Mail(options.mail);
        }
    }
    /** Pushes a message to the log file. */
    push(level, ...msg) {
        let _level = this.constructor["outputLevel"].toUpperCase();
        if (Logger.Levels[level] < Logger.Levels[_level])
            return void 0;
        let _msg = util.format.apply(undefined, msg), action = this.action ? ` [${this.action}]` : "";
        if (this.trace) {
            let target = {};
            Error.captureStackTrace(target);
            let stack = trimLeft(target.stack.split("\n")[3]).slice(3);
            action += " [" + stack.replace("default_1", "default") + "]";
        }
        level = level && level != "LOG" ? " [" + level + "]" : "";
        _msg = `[${moment().format("YYYY-MM-DDTHH:mm:ss")}]${level}${action} - ${_msg}`;
        super.push(_msg);
    }
    /** Outputs a message to the log file at LOG level. */
    log(...msg) {
        return this.push("LOG", ...msg);
    }
    /** Outputs a message to the log file at INFO level. */
    info(...msg) {
        return this.push("INFO", ...msg);
    }
    /** Outputs a message to the log file at WARN level. */
    warn(...msg) {
        return this.push("WARN", ...msg);
    }
    /** Outputs a message to the log file at ERROR level. */
    error(...msg) {
        return this.push("ERROR", ...msg);
    }
}
/** Sets the lowest level of logs that should output. */
Logger.outputLevel = "LOG";
(function (Logger) {
    let Levels;
    (function (Levels) {
        Levels[Levels["LOG"] = 0] = "LOG";
        Levels[Levels["INFO"] = 1] = "INFO";
        Levels[Levels["WARN"] = 2] = "WARN";
        Levels[Levels["ERROR"] = 3] = "ERROR";
    })(Levels = Logger.Levels || (Logger.Levels = {}));
    Logger.Options = Object.assign({}, OutputBuffer.Options, {
        trace: false,
        limitHandler: function (filename, data, next) {
            let $this = this;
            if ($this.mail) { // Send old logs as email to the receiver.
                if (!$this.mailer["message"].text)
                    $this.mailer.text("Please review the attachment.");
                if (!$this.mailer["message"].html)
                    $this.mailer.html("<p>Please review the attachment.</p>");
                // reset attachments.
                $this.mailer["message"].attachments = [];
                $this.mailer.attachment(filename).send().then(() => {
                    next();
                }).catch(err => {
                    $this.error(err);
                    next();
                });
            }
            else { // compress old logs
                let dir = path.dirname(filename) + `/${moment().format("YYYY-MM-DD")}/`, basename = path.basename(filename);
                fs.ensureDir(dir).then(() => {
                    return ideal_filename_1.default(`${dir}${basename}.gz`, ".log.gz");
                }).then(gzName => {
                    // compress to Gzip.
                    let gzip = zlib.createGzip(), input = fs.createReadStream(filename), output = fs.createWriteStream(gzName);
                    input.pipe(gzip).pipe(output);
                    output.on("close", () => next());
                }).catch(err => {
                    this.error(err);
                    next();
                });
            }
        },
        errorHandler: function (err) {
            this.error(err);
        }
    });
})(Logger || (Logger = {}));
module.exports = Logger;
//# sourceMappingURL=index.js.map