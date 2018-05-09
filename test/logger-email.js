
require("source-map-support/register");
const Logger = require("../");
const assert = require("assert");
const fs = require("fs-extra");
const date = require("sfn-date");

describe("Logger.prototype.log()", () => {
    it("should mail log file as expected", function (done) {
        this.timeout(12000);

        let filename = "logs/example-will-be-mailed.log",
            log = "Everything goes fine!";

        if(fs.existsSync(filename))
            fs.unlinkSync(filename);

        let logger = new Logger({
            filename,
            size: 512,
            fileSize: 4096,
            mail: {
                host: "smtp.exmail.qq.com",
                port: 25,
                subject: "Logs from my website",
                from: "test@hyurl.com",
                to: ["i@hyurl.com"],
                auth: {
                    username: "test@hyurl.com",
                    password: "April19810404"
                }
            }
        });

        for (let i = 0; i < 200; i ++) {
            logger.log(log + " - " + (i + 1));
        }

        setTimeout(() => {
            let contents = fs.readFileSync(filename, "utf8");
            assert.ok(contents.indexOf("[ERROR]") === -1);
            done();
            // logger.close();
        }, 11500);
    });
});