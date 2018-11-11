
require("source-map-support/register");
var Logger = require("../");
var assert = require("assert");
var fs = require("fs");

describe("Send e-mail when file size out limit", function () {
    it("should mail log file as expected", function (done) {
        return done();
        this.timeout(12000);

        var filename = "logs/example-will-be-mailed.log",
            log = "Everything goes fine!";

        if (fs.existsSync(filename))
            fs.unlinkSync(filename);

        var logger = new Logger({
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

        for (var i = 0; i < 200; i++) {
            logger.log(log + " - " + (i + 1));
        }

        setTimeout(function () {
            var contents = fs.readFileSync(filename, "utf8");
            assert.ok(contents.indexOf("[ERROR]") === -1);
            done();
            // logger.close();
        }, 11500);
    });
});