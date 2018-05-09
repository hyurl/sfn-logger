"use strict";
const cluster = require("cluster");
const path = require("path");
const zlib = require("zlib");
const util = require("util");
const fs = require("fs-extra");
const OutputBuffer = require("sfn-output-buffer");
const Mail = require("sfn-mail");
const date = require("sfn-date");
const ideal_filename_1 = require("ideal-filename");
class Logger extends OutputBuffer {
    constructor(arg, action = "default") {
        let options;
        if (typeof arg == "string") {
            options = { filename: arg };
        }
        else {
            options = arg;
        }
        super(options);
        this.action = action;
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
        if (cluster.isWorker) {
            // Send the log to the master if in a worker process.
            process.send({
                event: "----sfn-log----",
                level,
                msg,
                ttl: this.ttl,
                size: this.size,
                filename: this.filename,
                fileSize: this.fileSize,
                action: this.action,
                mail: this.mail,
            });
        }
        else {
            let _msg = util.format.apply(undefined, msg);
            level = level ? " [" + level + "]" : "";
            _msg = `[${date()}]${level} ${this.action} - ${_msg}`;
            super.push(_msg);
        }
    }
    /** Outputs a message to the log file at LOG level. */
    log(...msg) {
        return this.push("", ...msg);
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
Logger.Options = Object.assign(OutputBuffer.Options, {
    limitHandler: function (filename, data, next) {
        let $this = this;
        if ($this.mail) { // Send old logs as email to the receiver.
            if (!$this.mailer["message"].text)
                $this.mailer.text("Please review the attachment.");
            if (!$this.mailer["message"].html)
                $this.mailer.html("<p>Please review the attachment.</p>");
            // reset attachments.
            $this.mailer["message"].attachments = [];
            $this.mailer.attachment(filename).send().then(res => {
                next();
            }).catch(err => {
                $this.error(err);
                next();
            });
        }
        else { // compress old logs
            let dir = path.dirname(filename) + `/${date("Y-m-d")}/`, basename = path.basename(filename);
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
// Handle logs when the program runs in multiprocessing env.
if (cluster.isMaster) {
    let loggers = {};
    cluster.on("message", (worker, log) => {
        if (log.event === "----sfn-log----") {
            let { level, msg, filename, action } = log;
            if (!loggers[filename]) {
                loggers[filename] = new Logger(log, action);
            }
            else {
                loggers[filename].action = action;
            }
            loggers[filename].push(level, ...msg);
        }
    });
}
module.exports = Logger;
//# sourceMappingURL=index.js.map