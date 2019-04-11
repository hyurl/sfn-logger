var Logger = require("../");
var assert = require("assert");
var fs = require("fs");
var os = require("os");
var moment = require("moment");

describe("Logger.prototype.warn()", function () {
    it("should output logs on WARN level as expected", function (done) {
        var filename = "logs/example-warn.log",
            log = "Something goes not as expected!";

        if (fs.existsSync(filename))
            fs.unlinkSync(filename);

        var dateStr = moment().format("YYYY-MM-DDTHH:mm:ss");
        var logger = new Logger({
            filename,
            size: 4096
        });

        logger.warn(log);

        setTimeout(() => {
            logger.close(function () {
                try {
                    assert.equal(fs.readFileSync(filename, "utf8"), `[${dateStr}] [WARN] - ${log}${os.EOL}`);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        }, 200);
    });
});