
process.setMaxListeners(0);
require("source-map-support/register");
var Logger = require("../");
var assert = require("assert");
var fs = require("fs");
var moment = require("moment");
var idealFilename = require("ideal-filename");

describe("Compress when file size out limit", function () {
    it("should compress log file as expected", function (done) {
        var filename = "logs/example-will-be-compressed.log",
            compressDir = "logs/" + moment().format("YYYY-MM-DD"),
            compressFile = compressDir + "/example-will-be-compressed.log.gz",
            log = "Everything goes fine!";

        if (fs.existsSync(filename))
            fs.unlinkSync(filename);

        idealFilename(compressFile, ".log.gz", function (err, _filename) {
            var logger = new Logger({
                filename,
                size: 512,
                fileSize: 4096
            });

            for (var i = 0; i < 200; i++) {
                logger.log(log + " - " + (i + 1));
            }

            logger.close(() => {
                try {
                    assert.ok(fs.existsSync(_filename));
                    done();
                } catch (err) {
                    done(err);
                }
            }, 200);
        });
    });
});