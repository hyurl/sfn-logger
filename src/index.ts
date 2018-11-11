import * as path from "path";
import * as zlib from "zlib";
import * as util from "util";
import * as fs from "fs-extra";
import * as OutputBuffer from "sfn-output-buffer";
import * as Mail from "sfn-mail";
import * as moment from "moment";
import idealFilename from "ideal-filename";
import trimLeft = require("lodash/trimStart");

class Logger extends OutputBuffer implements Logger.Options {
    action: string;
    trace: boolean;
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

        if (options.mail instanceof Mail) {
            this.mailer = options.mail;
            this.mail = options.mail["options"];
        } else if (typeof options.mail == "object") {
            this.mailer = new Mail(options.mail);
        }
    }

    /** Pushes a message to the log file. */
    push(level: string, ...msg: any[]): void {
        let _level = this.constructor["outputLevel"].toUpperCase();
        if (Logger.Levels[level] < Logger.Levels[_level])
            return void 0;

        let _msg: string = util.format.apply(undefined, msg),
            action: string = this.action ? ` [${this.action}]` : "";

        if (this.trace) {
            let target: any = {};
            Error.captureStackTrace(target);
            let stack = trimLeft((<string>target.stack).split("\n")[3]).slice(3);
            action += " [" + stack.replace("default_1", "default") + "]";
        }

        level = level && level != "LOG" ? " [" + level + "]" : "";
        _msg = `[${moment().format("YYYY-MM-DDTHH:mm:ss")}]${level}${action} - ${_msg}`;

        super.push(_msg);
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
    export enum Levels {
        LOG,
        INFO,
        WARN,
        ERROR
    }

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
                let dir = path.dirname(filename) + `/${moment().format("YYYY-MM-DD")}/`,
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
}

export = Logger;