const fs = require("fs");
const zlib = require("zlib");
const path = require("path");
const util = require("util");
const cluster = require("cluster");
const Mail = require("sfn-mail");
const OutputBuffer = require("sfn-output-buffer");
const date = require('sfn-date');
const nextFilename = require("next-filename");

class Logger extends OutputBuffer {
    /**
     * Creates a new logger.
     * 
     * @param {String|Object} options A file that stores logs or an object 
     *  configures the logger.
     * @param {String} [action] An optional action name.
     */
    constructor(options, action = "default") {
        if (typeof options == "string") {
            options = { filename: options };
        }
        super(options);
        this.action = action;

        // If you want to send logs to an email address when the log 
        // file's size up to limit, you should pass `options.mail` a Mail 
        // instance or an object to configure for a new Mail instance (exposed
        // from sfn-mail module).
        if (options.mail instanceof Mail) {
            this.mail = options.mail;
        } else if (options.mail) {
            this.mail = new Mail(options.mail);
        } else {
            this.mail = null;
        }

        this.limitHandler = (filename, data, next) => {
            // Rewrite the log file.
            var rewriteFile = () => {
                fs.writeFile(filename, data, err => {
                    if (err)
                        this.error(err);
                    next();
                });
            };
            if (this.mail) {
                // Send old logs as email to the receiver.
                fs.readFile(filename, "utf8", (err, contents) => {
                    if (err) {
                        this.error(err);
                        return next();
                    }
                    if (this.mail && !(this.mail instanceof Mail))
                        this.mail = new Mail(this.mail);
                    this.mail
                        .text(contents)
                        .send()
                        .then(res => rewriteFile())
                        .catch(err => {
                            this.error(err);
                            next();
                        });
                });
            } else {
                // Compress the old file to GZip.
                var dir = path.dirname(filename) + `/${date("Y-m-d")}/`,
                    basename = path.basename(filename),
                    compress = () => {
                        nextFilename(`${dir}${basename}.gz`, ".log.gz")
                            .then(gzName => {
                                var gzip = zlib.createGzip(),
                                    input = fs.createReadStream(filename),
                                    output = fs.createWriteStream(gzName);
                                input.pipe(gzip).pipe(output);
                                output.on("close", () => rewriteFile());
                            }).catch(err => {
                                this.error(err);
                                next();
                            });
                    };
                fs.exists(dir, exists => {
                    if (exists) {
                        compress();
                    } else {
                        fs.mkdir(dir, err => {
                            if (err) {
                                this.error(err);
                                next();
                            } else {
                                compress();
                            }
                        });
                    }
                });
            }
        };
        this.errorHandler = (err) => {
            this.error(err);
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
        } else {
            msg = util.format(...msg);
            msg = `[${date()}] [${level}] ${this.action} - ${msg}`;
            super.push(msg);
        }
    }

    /**
     * Outputs a message to the log file at LOG level.
     * 
     * @param {String} msg Log message.
     */
    log(...msg) {
        return this.push("LOG", ...msg);
    }

    /**
     * Outputs a message to the log file at INFO level.
     * 
     * @param {String} msg Log message.
     */
    info(...msg) {
        return this.push("INFO", ...msg);
    }

    /**
     * Outputs a message to the log file at WARN level.
     * 
     * @param {String} msg Log message.
     */
    warn(...msg) {
        return this.push("WARN", ...msg);
    }

    /**
     * Outputs a message to the log file at ERROR level.
     * 
     * @param {String} msg Log message.
     */
    error(...msg) {
        return this.push("ERROR", ...msg);
    }
}

// Handle logs within multiprocessing.
if (cluster.isMaster) {
    let loggers = {};
    cluster.on("message", (worker, log) => {
        if (log.event === "----sfn-log----") {
            var { level, msg, filename, action } = log;
            if (!loggers[filename]) {
                loggers[filename] = new Logger(log, action);
            }
            loggers[filename].push(level, ...msg);
        }
    });
}

module.exports = Logger;