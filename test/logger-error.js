var Logger = require("../");
var assert = require("assert");
var fs = require("fs");
var os = require("os");
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

        setTimeout(() => {
            logger.close(() => {
                try {
                    logger.close();
                    assert.equal(fs.readFileSync(filename, "utf8"), `[${dateStr}] [ERROR] - ${log}${os.EOL}`);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        }, 200);
    });
});