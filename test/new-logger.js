var Logger = require("../");
var assert = require("assert");

describe("new Logger()", function () {
    describe("new Logger(filename: string, action?: string)", function () {
        it("should create instance with a filename", function () {
            var logger = new Logger("example.log"),
                expected = Object.assign({}, logger);

            delete expected.timer;
            delete expected.queue;
            delete expected.channel;
            delete expected.socket;

            assert.ok(typeof logger.queue == "object");
            assert.ok(typeof logger.timer == "object");
            assert.deepStrictEqual(expected, {
                fileSize: 2097152,
                filename: "example.log",
                size: undefined,
                ttl: 1000,
                buffer: [],
                trace: false,
                toConsole: false,
                outputLevel: 1,
                byteLength: 0,
                dateFormat: "YYYY-MM-DDTHH:mm:ss"
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
            delete expected.channel;
            delete expected.socket;

            assert.ok(typeof logger.queue == "object");
            assert.deepStrictEqual(expected, {
                fileSize: 2097152,
                filename: "example.log",
                size: 4096,
                timer: null,
                ttl: undefined,
                buffer: [],
                trace: false,
                toConsole: false,
                outputLevel: 1,
                byteLength: 0,
                dateFormat: "YYYY-MM-DDTHH:mm:ss"
            });

            setTimeout(() => {
                process.exit();
            }, 500);
        });
    });
});