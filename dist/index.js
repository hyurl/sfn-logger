"use strict";
const tslib_1 = require("tslib");
const path = require("path");
const zlib = require("zlib");
const util = require("util");
const os = require("os");
const fs = require("fs-extra");
const Mail = require("sfn-mail");
const moment = require("moment");
const ideal_filename_1 = require("ideal-filename");
const trimLeft = require("lodash/trimStart");
const sortBy = require("lodash/sortBy");
const hash = require("string-hash");
const dynamic_queue_1 = require("dynamic-queue");
const open_channel_1 = require("open-channel");
const bsp_1 = require("bsp");
const traceHacker = Symbol("traceHacker");
const eolLength = Buffer.from(os.EOL).byteLength;
class Logger {
    constructor(arg) {
        this.timer = null;
        this.buffer = [];
        this.bufferSize = 0;
        this.queue = new dynamic_queue_1.default();
        this.shouldTransmit = true;
        let options;
        if (typeof arg == "string") {
            options = { filename: arg };
        }
        else {
            options = arg;
        }
        Object.assign(this, this.constructor.Options, options);
        // Use open-channel to store log data between parallel processes and 
        // prevent concurrency control issues.
        this.channel = open_channel_1.default(String(hash(this.filename)), socket => {
            let temp = [];
            this.shouldTransmit = false;
            socket.on("data", buf => {
                for (let [time, log] of bsp_1.receive(buf, temp)) {
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
        }
        else {
            let next = () => {
                this.timer = setTimeout(() => {
                    this.flush(next);
                }, this.ttl);
            };
            next();
        }
    }
    set mail(value) {
        if (value instanceof Mail) {
            this.mailer = value;
        }
        else if (typeof value == "object") {
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
    close(cb) {
        let promise = new Promise((resolve) => {
            this.flush(() => {
                this.closed || this.socket.destroy();
                resolve();
            });
        });
        this.timer && clearTimeout(this.timer);
        if (cb) {
            promise.then(cb);
        }
        else {
            return promise;
        }
    }
    /** An alias of `debug()`. */
    log(...msg) {
        return this.push(Logger.Levels.DEBUG, ...msg);
    }
    /** Logs a message on DEBUG level. */
    debug(...msg) {
        return this.push(Logger.Levels.DEBUG, ...msg);
    }
    /** Logs a message on INFO level. */
    info(...msg) {
        return this.push(Logger.Levels.INFO, ...msg);
    }
    /** Logs a message on WARN level. */
    warn(...msg) {
        return this.push(Logger.Levels.WARN, ...msg);
    }
    /** Logs a message on ERROR level. */
    error(...msg) {
        return this.push(Logger.Levels.ERROR, ...msg);
    }
    /**
     * Temporarily ignores trace option and set stack message manually,
     * auto-recovered once any log method is called.
     */
    hackTrace(stack) {
        this[traceHacker] = { stack, trace: this.trace };
        this.trace = false;
    }
    push(level, ...msg) {
        let _level = " [" + Logger.Levels[level] + "]", time = Date.now(), log = util.format.apply(undefined, msg), stack = this[traceHacker]
            ? (" " + this[traceHacker].stack)
            : "";
        if (this.trace) {
            let target = {};
            Error.captureStackTrace(target);
            stack = trimLeft(target.stack.split("\n")[3]).slice(3);
            stack = " [" + stack.replace("default_1", "default") + "]";
        }
        else if (this[traceHacker]) {
            this.trace = this[traceHacker].trace;
            delete this[traceHacker];
        }
        log = `${_level}${stack} - ${log}`;
        if (level >= this.outputLevel) {
            if (this.shouldTransmit) {
                // transmit the log via the channel.
                this.socket.write(bsp_1.send(time, log));
            }
            else {
                this.memorize(time, log);
            }
        }
        if (this.toConsole) {
            let method = Logger.Levels[level].toLowerCase();
            console[method](`[${moment(time).format(this.dateFormat)}]${log}`);
        }
    }
    flush(cb) {
        cb = cb || (() => { });
        if (this.buffer.length === 0)
            return cb();
        this.queue.push((next) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            let callback = () => {
                next();
                cb();
            };
            try {
                let data = this.getAndClean();
                if (yield fs.pathExists(this.filename)) {
                    let stat = yield fs.stat(this.filename), size = stat.size + Buffer.byteLength(data);
                    if (size < this.fileSize) {
                        yield fs.appendFile(this.filename, data);
                        callback();
                    }
                    else {
                        yield this.relocateOldLogs();
                        yield fs.writeFile(this.filename, data, "utf8");
                        callback();
                    }
                }
                else {
                    yield fs.ensureDir(path.dirname(this.filename));
                    yield fs.writeFile(this.filename, data, "utf8");
                    callback();
                }
            }
            catch (err) {
                this.error(err);
                callback();
            }
        }));
    }
    memorize(time, log) {
        log = `[${moment(time).format(this.dateFormat)}]${log}`;
        this.buffer.push([time, log]);
        this.bufferSize += Buffer.byteLength(log) + eolLength;
        if (this.size) {
            this.bufferSize >= this.size && this.flush();
        }
    }
    getAndClean() {
        let data = sortBy(this.buffer, 0).map(buf => buf[1] + os.EOL).join("");
        this.buffer = [];
        this.bufferSize = 0;
        return data;
    }
    relocateOldLogs() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (this.mail) { // Send old logs via email to the receiver.
                if (!this.mailer["message"].text)
                    this.mailer.text("Please review the attachment.");
                if (!this.mailer["message"].html)
                    this.mailer.html("<p>Please review the attachment.</p>");
                // reset attachment.
                this.mailer["message"].attachments = [];
                return this.mailer.attachment(this.filename).send();
            }
            else { // compress old logs
                let dir = path.dirname(this.filename)
                    + `/${moment().format("YYYY-MM-DD")}`;
                yield fs.ensureDir(dir);
                let basename = path.basename(this.filename), ext = path.extname(this.filename) + ".gz", gzName = yield ideal_filename_1.default(`${dir}/${basename}.gz`, ext), gzip = zlib.createGzip(), input = fs.createReadStream(this.filename), output = fs.createWriteStream(gzName);
                return new Promise(resolve => {
                    output.once("close", resolve);
                    input.pipe(gzip).pipe(output);
                });
            }
        });
    }
}
(function (Logger) {
    let Levels;
    (function (Levels) {
        Levels[Levels["DEBUG"] = 1] = "DEBUG";
        Levels[Levels["INFO"] = 2] = "INFO";
        Levels[Levels["WARN"] = 3] = "WARN";
        Levels[Levels["ERROR"] = 4] = "ERROR";
    })(Levels = Logger.Levels || (Logger.Levels = {}));
    Logger.Options = {
        ttl: 1000,
        size: undefined,
        filename: undefined,
        fileSize: 1024 * 1024 * 2,
        dateFormat: "YYYY-MM-DDTHH:mm:ss",
        trace: false,
        toConsole: false,
        outputLevel: Logger.Levels.DEBUG,
        mail: undefined
    };
})(Logger || (Logger = {}));
module.exports = Logger;
//# sourceMappingURL=index.js.map