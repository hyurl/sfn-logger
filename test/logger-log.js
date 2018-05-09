const Logger = require("../");
const assert = require("assert");
const fs = require("fs");
const date = require("sfn-date");

describe("Logger.prototype.log()", () => {
    it("should output logs on LOG level as expected", function (done) {
        let filename = "logs/example-log.log",
            log = "Everything goes fine!";

        if(fs.existsSync(filename))
            fs.unlinkSync(filename);

        let dateStr = date();
        let logger = new Logger({
            filename,
            size: 4096
        });

        logger.log(log);
        logger.close();

        setTimeout(() => {
            assert.equal(fs.readFileSync(filename, "utf8"), `[${dateStr}] default - ${log}${logger.EOL}`);
            done();
        }, 500);
    });
});