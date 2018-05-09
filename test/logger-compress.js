
require("source-map-support/register");
const Logger = require("../");
const assert = require("assert");
const fs = require("fs-extra");
const date = require("sfn-date");

var compressDir = "logs/" + date("Y-m-d");

if(fs.existsSync(compressDir)) {
    fs.removeSync(compressDir);
}

describe("Logger.prototype.log()", () => {
    it("should compress log file as expected", function (done) {
        this.timeout(6000);

        let filename = "logs/example-will-be-compressed.log",
            log = "Everything goes fine!";

        if(fs.existsSync(filename))
            fs.unlinkSync(filename);

        let logger = new Logger({
            filename,
            size: 512,
            fileSize: 4096
        });

        for (let i = 0; i < 200; i ++) {
            logger.log(log + " - " + (i + 1));
        }

        setTimeout(() => {
            assert.ok(fs.existsSync(compressDir + "/example-will-be-compressed.log.gz"));
            done();
            // logger.close();
        }, 1500);
    });
});