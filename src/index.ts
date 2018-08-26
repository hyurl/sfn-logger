import * as cluster from "cluster";
import * as path from "path";
import * as zlib from "zlib";
import * as util from "util";
import * as fs from "fs";
import * as OutputBuffer from "sfn-output-buffer";
import * as Mail from "sfn-mail";
import * as date from "sfn-date";
import idealFilename from "ideal-filename";
import mkdir = require("mkdirp");
import trimLeft = require("lodash/trimStart");

declare global {
    interface ObjectConstructor {
        assign(target: object, ...sources: any[]): any;
    }
}

const isOldNode = parseFloat(process.version.slice(1)) < 6.0;
const SfnMail: typeof Mail = isOldNode ? null : require("sfn-mail");

enum Levels {
    LOG,
    INFO,
    WARN,
    ERROR
}

class Logger extends OutputBuffer implements Logger.Options {
    readonly action: string;
    readonly trace: boolean;
    readonly mail: Mail.Options & Mail.Message;
    readonly mailer: Mail;

    /** Sets the lowest level of logs that should output. */
    static outputLevel: string = "LOG";

    constructor(options?: Logger.Options, action?: string);
    constructor(filename: string, action?: string);
    constructor(arg, action: string) {
        let options: Logger.Options;
        if (typeof arg == "string") {
            options = { filename: arg };
        } else {
            options = arg;
        }

        super(options);
        this.action = action || options.action;

        if (typeof SfnMail == "function") {
            if (options.mail instanceof SfnMail) {
                this.mailer = options.mail;
                this.mail = options.mail["options"];
            } else if (typeof options.mail == "object") {
                this.mailer = new SfnMail(options.mail);
            }
        }
    }

    /** Pushes a message to the log file. */
    push(level: string, ...msg: any[]): void {
        if (Levels[level] < Levels[this.constructor["outputLevel"].toUpperCase()])
            return void 0;

        let _msg: string = util.format.apply(undefined, msg),
            action: string = this.action ? ` ${this.action}` : "";

        if (this.trace) {
            let target: any = {};
            Error.captureStackTrace(target);
            action += " " + trimLeft((<string>target.stack).split("\n")[3]).slice(3);
        }

        action = action ? action + " -" : "";

        level = level && level != "LOG" ? " [" + level + "]" : "";
        _msg = `[${date()}]${level}${action} ${_msg}`;

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
        } else {
            super.push(_msg);
        }
    }

    /** Outputs a message to the log file at LOG level. */
    log(...msg: any[]): void {
        return this.push("LOG", ...msg);
    }

    /** Outputs a message to the log file at INFO level. */
    info(...msg: any[]): void {
        return this.push("INFO", ...msg);
    }

    /** Outputs a message to the log file at WARN level. */
    warn(...msg: any[]): void {
        return this.push("WARN", ...msg);
    }

    /** Outputs a message to the log file at ERROR level. */
    error(...msg: any[]): void {
        return this.push("ERROR", ...msg);
    }
}

namespace Logger {
    export interface Options extends OutputBuffer.Options {
        mail?: Mail | Mail.Options & Mail.Message;
        /**
         * If set, the log will trace and output the file and position where 
         * triggers logging.
         */
        trace?: boolean;
        action?: string;
    }

    export const Options: Options = Object.assign({}, OutputBuffer.Options, {
        trace: false,
        limitHandler: function (filename, data, next) {
            let $this: Logger = this;
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
            } else { // compress old logs
                let dir = path.dirname(filename) + `/${date("Y-m-d")}/`,
                    basename = path.basename(filename);

                new Promise((resolve, reject) => {
                    fs.exists(dir, exists => {
                        if (exists) {
                            resolve(dir);
                        } else {
                            mkdir(dir, err => {
                                err ? reject(err) : resolve(dir);
                            });
                        }
                    });
                }).then(() => {
                    return idealFilename(`${dir}${basename}.gz`, ".log.gz");
                }).then(gzName => {
                    // compress to Gzip.
                    let gzip = zlib.createGzip(),
                        input = fs.createReadStream(filename),
                        output = fs.createWriteStream(gzName);

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
}

// Handle logs when the program runs in multiprocessing env.
if (cluster.isMaster) {
    let loggers: { [filename: string]: Logger } = {};

    cluster.on("message", (worker, log) => {
        log = isOldNode ? worker : log; // for nodejs before v6.0

        if (log.event == "----sfn-log----") {
            let { msg, filename } = log;

            if (!loggers[filename]) {
                loggers[filename] = new Logger(log);
            }

            OutputBuffer.prototype.push.call(loggers[filename], msg);
        }
    });
}

export = Logger;