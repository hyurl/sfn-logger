var Logger = require("../");
var assert = require("assert");
var fs = require("fs");
var date = require("sfn-date");

describe("Logger.prototype.info()", function () {
    it("should output logs on INFO level as expected", function (done) {
        var filename = "logs/example-info.log",
            log = "Everything goes fine!";

        if (fs.existsSync(filename))
            fs.unlinkSync(filename);

        var dateStr = date();
        var logger = new Logger({
            filename,
            size: 4096
        });

        logger.info(log);
        logger.close();

        setTimeout(function () {
            assert.equal(fs.readFileSync(filename, "utf8"), `[${dateStr}] [INFO] - ${log}${logger.EOL}`);
            done();
        }, 500);
    });
});