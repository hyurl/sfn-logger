const Logger = require("../");
const assert = require("assert");
const { EOL } = require("os");

describe("new Logger()", () => {
    describe("new Logger(filename: string, action?: string)", () => {
        it("should create instance with a filename", () => {
            let logger = new Logger("example.log"),
                expected = Object.assign({}, logger);

            delete expected.timer;
            delete expected.queue;

            assert.ok(typeof logger.queue == "object");
            assert.ok(typeof logger.timer == "object");
            assert.deepStrictEqual(expected, {
                EOL,
                action: "default",
                closed: false,
                errorHandler: Logger.Options.errorHandler,
                fileSize: 2097152,
                filename: "example.log",
                limitHandler: Logger.Options.limitHandler,
                size: undefined,
                ttl: 1000,
                buffer: null,
            });

            logger.close();
        });

        it("should create instance with a filename and a action name", () => {
            let logger = new Logger("example.log", "my-log"),
                expected = Object.assign({}, logger);

            delete expected.timer;
            delete expected.queue;

            assert.ok(typeof logger.queue == "object");
            assert.ok(typeof logger.timer == "object");
            assert.deepStrictEqual(expected, {
                EOL,
                action: "my-log",
                closed: false,
                errorHandler: Logger.Options.errorHandler,
                fileSize: 2097152,
                filename: "example.log",
                limitHandler: Logger.Options.limitHandler,
                size: undefined,
                ttl: 1000,
                buffer: null
            });

            logger.close();
        });
    });

    describe("new Logger(options: Logger.Options, action?: string)", () => {
        it("should create instance with options", () => {
            let logger = new Logger({
                filename: "example.log",
                size: 4096
            });
            let expected = Object.assign({}, logger);

            delete expected.queue;

            assert.ok(typeof logger.queue == "object");
            assert.deepStrictEqual(expected, {
                EOL,
                action: "default",
                closed: false,
                errorHandler: Logger.Options.errorHandler,
                fileSize: 2097152,
                filename: "example.log",
                limitHandler: Logger.Options.limitHandler,
                size: 4096,
                timer: null,
                ttl: undefined,
                buffer: null,
            });
        });

        it("should create instance with options and a action name", () => {
            let logger = new Logger({
                filename: "example.log",
                size: 4096
            }, "my-log");
            let expected = Object.assign({}, logger);

            delete expected.queue;

            assert.ok(typeof logger.queue == "object");
            assert.deepStrictEqual(expected, {
                EOL,
                action: "my-log",
                closed: false,
                errorHandler: Logger.Options.errorHandler,
                fileSize: 2097152,
                filename: "example.log",
                limitHandler: Logger.Options.limitHandler,
                size: 4096,
                timer: null,
                ttl: undefined,
                buffer: null,
            });
        });
    });
});