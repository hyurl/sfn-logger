var Logger = require("../");
var assert = require("assert");
var fs = require("fs");
var moment = require("moment");

describe("Logger.prototype.log()", function () {
    it("should output logs as expected", function (done) {
        var filename = "logs/example-log.log",
            log = "Everything goes fine!";

        if (fs.existsSync(filename))
            fs.unlinkSync(filename);

        var dateStr = moment().format("YYYY-MM-DDTHH:mm:ss");
        var logger = new Logger({
            filename,
            size: 4096
        });

        logger.log(log);
        logger.close();

        setTimeout(function () {
            assert.equal(fs.readFileSync(filename, "utf8"), `[${dateStr}] - ${log}${logger.EOL}`);
            done();
        }, 500);
    });
});