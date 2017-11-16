const Logger = require("./");

var logger = new Logger("example.log");
logger.size = 1024; // 1 Kb
logger.fileSize = 1024 * 1024; // 1 Mb

var count = 0,
    timer = setInterval(() => {
        logger.log("Hello, World!");

        count += 1;
        if (count === 10) {
            clearInterval(timer);
            logger.close();
        }
    }, 1000);