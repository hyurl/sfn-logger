# SFN-Logger

**Simple Friendly Node.js Logger.**

## Install

```sh
npm install sfn-logger --save
```

## Example

```javascript
const Logger = require("sfn-logger");

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
```

## API

### `new Logger(options: string|object, action:? string)`

**Creates a new logger.**

- `options` A file that stores logs or an object configures the logger, 
    supports:
    - `ttl` Time to live, default is `1000`ms.
    - `size` Buffer size, if set, then `ttl` will be ignored.
    - `filename` Flush buffer to a disk file.
    - `fileSize` Maximum size of the output file.
    - `mail` An object configures a new Mail instance (from 
        [sfn-mail](https://github.com/hyurl/sfn-mail)) or a existing Mail 
        instance.
- `[action]` An optional action name, default is `default`.

```javascript
// Simplest way to create a logger:
var logger = new Logger("example.log");

// Or specify more details:
var logger = new Logger({
    size: 1024 * 4,
    filename: "example.log",
    fileSize: 1024 * 1024 * 2,
});

// Send log file contents as an email when the file size up to limit:
var logger = new Logger({
    size: 1024 * 4,
    filename: "example.log",
    fileSize: 1024 * 1024 * 2,
    mail: {
        subject: "Logs of My Website"
        host: "smtp.mail.qq.com",
        port: 25,
        from: "xxxxxxxx@qq.com",
        to: "xxxxxxxx@qq.com",
        auth: {
            user: "xxxxxxxx@qq.com",
            pass: "xxxxxxxx",
        }
    }
});
```

If you don't set the `mail`, when file's size up to limit, its contents will 
be compressed to GZip and stored in a directory named according to date.

## Familiar Methods

- `logger.log()` Outputs a message to the log file at LOG level.
- `logger.info()` Outputs a message to the log file at INFO level.
- `logger.warn()` Outputs a message to the log file at WARN level.
- `logger.error()` Outputs a message to the log file at ERROR level.

These methods' usage are exactly the same as `console`'s, if you're not 
familiar with them, please check 
[https://nodejs.org/dist/latest-v8.x/docs/api/console.html](https://nodejs.org/dist/latest-v8.x/docs/api/console.html).

## Multi-Processing

This module supports multiprocessing, when the current process is a worker 
process, then every thing you logged will be send to the master process, which
will handle logging in multiprocessing to protect concurrency conflicts.

Multiprocessing relies on the module 
[sfn-channel](https://github.com/Hyurl/sfn-channel), which is a better way to 
communicate between processes.

```javascript
const Channel = require("sfn-cahnnel");
const Logger = require("sfn-logger");

if(Channel.isMaster){
    // Create two channels to workers A and B.
    new Channel("A", true);
    new Channel("B", true);
}else{
    Channel.on("online", channel=>{
        var logger = new Logger("example.log");

        logger.log("This log will sent to the master process.");
    });
}
```