var Logger = require("../");
var assert = require("assert");
var EOL = require("os").EOL;

describe("new Logger()", function () {
    describe("new Logger(filename: string, action?: string)", function () {
        it("should create instance with a filename", function () {
            var logger = new Logger("example.log"),
                expected = Object.assign({}, logger);

            delete expected.timer;
            delete expected.queue;

            assert.ok(typeof logger.queue == "object");
            assert.ok(typeof logger.timer == "object");
            assert.deepStrictEqual(expected, {
                EOL,
                action: undefined,
                closed: false,
                errorHandler: Logger.Options.errorHandler,
                fileSize: 2097152,
                filename: "example.log",
                limitHandler: Logger.Options.limitHandler,
                size: undefined,
                ttl: 1000,
                buffer: null,
                trace: false
            });

            logger.close();
        });

        it("should create instance with a filename and a action name", function () {
            var logger = new Logger("example.log", "my-log"),
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
                buffer: null,
                trace: false
            });

            logger.close();
        });
    });

    describe("new Logger(options: Logger.Options, action?: string)", function () {
        it("should create instance with options", function () {
            var logger = new Logger({
                filename: "example.log",
                size: 4096
            });
            var expected = Object.assign({}, logger);

            delete expected.queue;

            assert.ok(typeof logger.queue == "object");
            assert.deepStrictEqual(expected, {
                EOL,
                action: undefined,
                closed: false,
                errorHandler: Logger.Options.errorHandler,
                fileSize: 2097152,
                filename: "example.log",
                limitHandler: Logger.Options.limitHandler,
                size: 4096,
                timer: null,
                ttl: undefined,
                buffer: null,
                trace: false
            });
        });

        it("should create instance with options and a action name", function () {
            var logger = new Logger({
                filename: "example.log",
                size: 4096
            }, "my-log");
            var expected = Object.assign({}, logger);

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
                trace: false
            });
        });
    });
});