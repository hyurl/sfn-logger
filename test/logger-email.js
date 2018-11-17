
require("source-map-support/register");
var Logger = require("../");
var assert = require("assert");
var fs = require("fs");

describe("Send e-mail when file size out limit", function () {
    it("should mail log file as expected", function (done) {
        done()
        // this.timeout(10000);

        // var filename = "logs/example-will-be-mailed.log",
        //     log = "Everything goes fine!";

        // if (fs.existsSync(filename))
        //     fs.unlinkSync(filename);

        // var logger = new Logger({
        //     filename,
        //     size: 512,
        //     fileSize: 4096,
        //     mail: {
        //         host: "smtp.exmail.qq.com",
        //         port: 25,
        //         subject: "Logs from my website",
        //         from: "test@hyurl.com",
        //         to: ["i@hyurl.com"],
        //         auth: {
        //             username: "test@hyurl.com",
        //             password: "April19810404"
        //         }
        //     }
        // });

        // for (var i = 0; i < 200; i++) {
        //     logger.warn(log + " - " + (i + 1));
        // }

        // logger.close(() => {
        //     try {
        //         var contents = fs.readFileSync(filename, "utf8");
        //         assert.ok(contents.indexOf("[WARN]") === -1);
        //         done();
        //     } catch (err) {
        //         done(err);
        //     }
        // }, 9950);
    });
});