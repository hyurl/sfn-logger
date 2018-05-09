import * as cluster from "cluster";
import * as path from "path";
import * as zlib from "zlib";
import * as util from "util";
import * as fs from "fs-extra";
import * as OutputBuffer from "sfn-output-buffer";
import * as Mail from "sfn-mail";
import * as date from "sfn-date";
import idealFilename from "ideal-filename";

namespace Logger {
    export interface Options extends OutputBuffer.Options {
        mail?: Mail | Mail.Options & Mail.Message;
    }
}

class Logger extends OutputBuffer implements Logger.Options {
    action: string;
    readonly mail: Mail.Options & Mail.Message;
    private mailer: Mail;

    static Options: Logger.Options = Object.assign(OutputBuffer.Options, {
        limitHandler: function (filename, data, next) {
            let $this: Logger = this;
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
            } else { // compress old logs
                let dir = path.dirname(filename) + `/${date("Y-m-d")}/`,
                    basename = path.basename(filename);

                fs.ensureDir(dir).then(() => {
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

    constructor(options?: Logger.Options, action?: string);
    constructor(filename: string, action?: string);
    constructor(arg, action: string = "default") {
        let options: Logger.Options;
        if (typeof arg == "string") {
            options = { filename: arg };
        } else {
            options = arg;
        }

        super(options);
        this.action = action;

        if (options.mail instanceof Mail) {
            this.mailer = options.mail;
            this.mail = options.mail["options"];
        } else if (typeof options.mail == "object") {
            this.mailer = new Mail(options.mail);
        }
    }

    /** Pushes a message to the log file. */
    push(level: string, ...msg: any[]): void {
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
            let _msg: string = util.format.apply(undefined, msg);

            level = level ? " [" + level + "]" : "";
            _msg = `[${date()}]${level} ${this.action} - ${_msg}`;

            super.push(_msg);
        }
    }

    /** Outputs a message to the log file at LOG level. */
    log(...msg: any[]): void {
        return this.push("", ...msg);
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

// Handle logs when the program runs in multiprocessing env.
if (cluster.isMaster) {
    let loggers: { [filename: string]: Logger } = {};

    cluster.on("message", (worker, log) => {
        if (log.event === "----sfn-log----") {
            let { level, msg, filename, action } = log;

            if (!loggers[filename]) {
                loggers[filename] = new Logger(log, action);
            } else {
                loggers[filename].action = action;
            }

            loggers[filename].push(level, ...msg);
        }
    });
}

export = Logger;