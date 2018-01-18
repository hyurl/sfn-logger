import * as OutputBuffer from "sfn-output-buffer";
import * as Mail from "sfn-mail";

declare class Logger extends OutputBuffer {
    constructor(optinos: {
        ttl?: number,
        size?: number,
        filename?: string,
        fileSize?: number,
        mail: Mail | object
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