var Logger = require("../");
var assert = require("assert");
var fs = require("fs");
var moment = require("moment");

describe("Logger.prototype.error()", function () {
    it("should output logs on ERROR level as expected", function (done) {
        var filename = "logs/example-error.log",
            log = "Something goes wrong!";

        if (fs.existsSync(filename))
            fs.unlinkSync(filename);

        var dateStr = moment().format("YYYY-MM-DDTHH:mm:ss");
        var logger = new Logger({
            filename,
            size: 4096
        });

        logger.error(log);
        logger.close();

        setTimeout(function () {
            // console.log(logger.queue)
            assert.equal(fs.readFileSync(filename, "utf8"), `[${dateStr}] [ERROR] - ${log}${logger.EOL}`);
            done();
        }, 500);
    });
});