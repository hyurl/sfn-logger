import OutputBuffer = require("sfn-output-buffer");
import Mail = require("sfn-mail");

declare class Logger extends OutputBuffer {
    action: string;
    private mailer: Mail;

    constructor(optinos?: {
        /** How long that the output buffer contents will last. */
        ttl?: number,
        /** The size of output buffer. */
        size?: number,
        /** The file that stores the logs. */
        filename?: string,
        /** The maximum size of the output file. */
        fileSize?: number,
        /** A mail instance or options for sending logs. */
        mail?: Mail | object
    }, action?: string);
    constructor(filename: string, action?: string);

    push(level: "LOG" | "INFO" | "WARN" | "ERROR", ...msg: string[]): void;

    /** Outputs a message to the log file at LOG level. */
    log(...msg: string[]): void;

    /** Outputs a message to the log file at INFO level. */
    info(...msg: string[]): void;

    /** Outputs a message to the log file at WARN level. */
    warn(...msg: string[]): void;

    /** Outputs a message to the log file at ERROR level. */
    error(...msg: string[]): void;
}

export = Logger;