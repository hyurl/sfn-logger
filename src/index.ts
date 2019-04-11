import * as path from "path";
import * as zlib from "zlib";
import * as util from "util";
import * as os from "os";
import * as net from "net";
import * as fs from "fs-extra";
import * as Mail from "sfn-mail";
import * as moment from "moment";
import idealFilename from "ideal-filename";
import trimLeft = require("lodash/trimStart");
import sortBy = require("lodash/sortBy");
import hash = require("string-hash");
import Queue from "dynamic-queue";
import openChannel, { ProcessChannel } from "open-channel";
import { send, receive } from "bsp";

const traceHacker = Symbol("traceHacker");
const eolLength = Buffer.from(os.EOL).byteLength;

class Logger implements Logger.Options {
    ttl: number;
    size: number;
    filename: string;
    fileSize: number;
    dateFormat: string;
    trace: boolean;
    toConsole: boolean;
    outputLevel: number;

    private mailer: Mail;
    private timer: NodeJS.Timer = null;
    private buffer: [number, string][] = [];
    private bufferSize = 0;
    private queue = new Queue();
    private channel: ProcessChannel;
    private socket: net.Socket;
    private shouldTransmit = true;

    constructor(filename: string);
    constructor(options?: Logger.Options);
    constructor(arg) {
        let options: Logger.Options;
        if (typeof arg == "string") {
            options = { filename: arg };
        } else {
            options = arg;
        }

        Object.assign(this, (<typeof Logger>this.constructor).Options, options);

        // Use open-channel to store log data between parallel processes and 
        // prevent concurrency control issues.
        this.channel = openChannel(String(hash(this.filename)), socket => {
            let temp: Buffer[] = [];

            this.shouldTransmit = false;
            socket.on("data", buf => {
                for (let [time, log] of receive<[number, string]>(buf, temp)) {
                    this.memorize(time, log);
                }
            });
        });
        this.socket = this.channel.connect();

        if (this.size) {
            this.ttl = undefined;

            process.on("beforeExit", (code) => {
                if (!code) {
                    this.close();
                }
            });
        } else {
            let next = () => {
                this.timer = setTimeout(() => {
                    this.flush(next);
                }, this.ttl);
            };

            next();
        }
    }

    set mail(value: Mail | (Mail.Options & Mail.Message)) {
        if (value instanceof Mail) {
            this.mailer = value;
        } else if (typeof value == "object") {
            this.mailer = new Mail(value);
        }
    }

    get mail() {
        return this.mailer;
    }

    /** Whether the logger has be closed. */
    get closed() {
        return this.socket.destroyed;
    }

    /**
     * Closes the logger safely, flushes buffer before destroying.
     */
    close(): Promise<void>;
    close(cb: () => void): void;
    close(cb?: () => void): void | Promise<void> {
        let promise = new Promise((resolve) => {
            this.flush(() => {
                this.closed || this.socket.destroy();
                resolve();
            });
        }) as Promise<void>;

        this.timer && clearTimeout(this.timer);

        if (cb) {
            promise.then(cb);
        } else {
            return promise;
        }
    }

    /** An alias of `debug()`. */
    log(...msg: any[]): void {
        return this.push(Logger.Levels.DEBUG, ...msg);
    }

    /** Logs a message on DEBUG level. */
    debug(...msg: any[]): void {
        return this.push(Logger.Levels.DEBUG, ...msg);
    }

    /** Logs a message on INFO level. */
    info(...msg: any[]): void {
        return this.push(Logger.Levels.INFO, ...msg);
    }

    /** Logs a message on WARN level. */
    warn(...msg: any[]): void {
        return this.push(Logger.Levels.WARN, ...msg);
    }

    /** Logs a message on ERROR level. */
    error(...msg: any[]): void {
        return this.push(Logger.Levels.ERROR, ...msg);
    }

    /**
     * Temporarily ignores trace option and set stack message manually, 
     * auto-recovered once any log method is called.
     */
    hackTrace(stack: string): void {
        this[traceHacker] = { stack, trace: this.trace };
        this.trace = false;
    }

    private push(level: number, ...msg: any[]): void {
        let _level = " [" + Logger.Levels[level] + "]",
            time = Date.now(),
            log: string = util.format.apply(undefined, msg),
            stack: string = this[traceHacker]
                ? (" " + this[traceHacker].stack)
                : "";

        if (this.trace) {
            let target: any = {};
            Error.captureStackTrace(target);
            stack = trimLeft((<string>target.stack).split("\n")[3]).slice(3);
            stack = " [" + stack.replace("default_1", "default") + "]";
        } else if (this[traceHacker]) {
            this.trace = this[traceHacker].trace;
            delete this[traceHacker];
        }

        log = `${_level}${stack} - ${log}`;

        if (level >= this.outputLevel) {
            if (this.shouldTransmit) {
                // transmit the log via the channel.
                this.socket.write(send(time, log));
            } else {
                this.memorize(time, log);
            }
        }

        if (this.toConsole) {
            let method = Logger.Levels[level].toLowerCase();
            console[method](`[${moment(time).format(this.dateFormat)}]${log}`);
        }
    }

    private flush(cb?: () => void): void {
        cb = cb || (() => { });

        if (this.buffer.length === 0)
            return cb();

        this.queue.push(async (next) => {
            let callback = () => {
                next();
                cb();
            };

            try {
                let data = this.getAndClean();

                if (await fs.pathExists(this.filename)) {
                    let stat = await fs.stat(this.filename),
                        size = stat.size + Buffer.byteLength(data);

                    if (size < this.fileSize) {
                        await fs.appendFile(this.filename, data);
                        callback();
                    } else {
                        await this.relocateOldLogs();
                        await fs.writeFile(this.filename, data, "utf8");
                        callback();
                    }
                } else {
                    await fs.ensureDir(path.dirname(this.filename));
                    await fs.writeFile(this.filename, data, "utf8");
                    callback();
                }
            } catch (err) {
                this.error(err);
                callback();
            }
        });
    }

    private memorize(time: number, log: string) {
        log = `[${moment(time).format(this.dateFormat)}]${log}`;
        this.buffer.push([time, log]);
        this.bufferSize += Buffer.byteLength(log) + eolLength;

        if (this.size) {
            this.bufferSize >= this.size && this.flush();
        }
    }

    private getAndClean(): string {
        let data = sortBy(this.buffer, 0).map(buf => buf[1] + os.EOL).join("");
        this.buffer = [];
        this.bufferSize = 0;
        return data;
    }

    private async relocateOldLogs(): Promise<any> {
        if (this.mail) { // Send old logs via email to the receiver.
            if (!this.mailer["message"].text)
                this.mailer.text("Please review the attachment.");
            if (!this.mailer["message"].html)
                this.mailer.html("<p>Please review the attachment.</p>");

            // reset attachment.
            this.mailer["message"].attachments = [];

            return this.mailer.attachment(this.filename).send();
        } else { // compress old logs
            let dir = path.dirname(this.filename)
                + `/${moment().format("YYYY-MM-DD")}`;

            await fs.ensureDir(dir);

            let basename = path.basename(this.filename),
                ext = path.extname(this.filename) + ".gz",
                gzName = await idealFilename(`${dir}/${basename}.gz`, ext),
                gzip = zlib.createGzip(),
                input = fs.createReadStream(this.filename),
                output = fs.createWriteStream(gzName);

            return new Promise(resolve => {
                output.once("close", resolve);
                input.pipe(gzip).pipe(output);
            });
        }
    }
}

namespace Logger {
    export enum Levels {
        DEBUG = 1,
        INFO,
        WARN,
        ERROR
    }

    export interface Options {
        /**
         * How much time should the output buffer keep contents before flushing,
         * default value is `1000` ms.
         */
        ttl?: number;
        /**
         * How much size should the output buffer keep contents before flushing.
         * This option conflicts with `ttl`, set only one of them. For data 
         * integrity, the real size of flushing data may be smaller than the 
         * setting value.
         */
        size?: number;
        /** Writes log contents to the target file. */
        filename: string;
        /**
         * The size of the log file, when up to limit, logs will be compressed
         * or sent via e-mail, default value is `2097152` bytes (2 Mb). For data 
         * integrity, the real size of the file may be smaller than the setting 
         * value.
         */
        fileSize?: number;
        /**
         * The format of prefix date-time value, default value is 
         * `YYYY-MM-DDTHH:mm:ss`.
         */
        dateFormat?: string;
        /**
         * The log message should contain the filename and position of where 
         * triggers the logging operation, `false` by default.
         */
        trace?: boolean;
        /** The log should also be output to the console, `false` by default. */
        toConsole?: boolean;
        /**
         * Sets the minimum level of logs that should be output to the file,
         * default value is `Logger.Levels.DEBUG`.
         */
        outputLevel?: number;
        mail?: Mail | (Mail.Options & Mail.Message);
    }

    export const Options: Options = {
        ttl: 1000,
        size: undefined,
        filename: undefined,
        fileSize: 1024 * 1024 * 2, // 2Mb
        dateFormat: "YYYY-MM-DDTHH:mm:ss",
        trace: false,
        toConsole: false,
        outputLevel: Logger.Levels.DEBUG,
        mail: undefined
    };
}

export = Logger;