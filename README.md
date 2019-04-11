# SFN-Logger

**Simple and friendly NodeJS file logger.**

*This documentation is for sfn-logger 0.4.x, old versions are deprecated.*

## Install

```sh
npm install sfn-logger --save
```

## Example

```javascript
const Logger = require("sfn-logger");

var logger = new Logger("example.log");

logger.log("Hello, World!");
```

## Create Logger

- `new Logger(filename: string)` Creates a logger instance with a filename.
- `new Logger(options: Logger.Options)` Creates a logger instance with options.
- `Logger.Options`
    - `ttl?: number` How much time should the output buffer keep contents before
        flushing, default value is `1000` ms.
    - `size?: number` How much size should the output buffer keep contents 
        before flushing. This option conflicts with `ttl`, set only one of them.
        For data integrity, the real size of flushing data may be smaller than
        the setting value.
    - `filename: string` Writes the contents to the target file.
    - `fileSize?: number` The size of the log file, when up to limit, logs will
        be compressed or sent via e-mail, default value is `2097152` bytes (2 Mb). 
        For data integrity, the real size of the file may be smaller than the 
        setting value.
    - `dateFormat?: string` The format of prefix date-time value, default value 
        is `YYYY-MM-DDTHH:mm:ss`, used by [moment](https://momentjs.com).
    - `trace?: boolean` The log message should contain the filename and position
        of where triggers the logging operation, `false` by default.
    - `toConsole?: boolean` The log should also be output to the console, 
        `false` by default.
    - `outputLevel?: number` Sets the minimum level of logs that should be 
        output to the file, default value is `Logger.Levels.DEBUG`.
    - `mail` An object configures a new Mail instance (from 
            [sfn-mail](https://github.com/hyurl/sfn-mail)) or a existing Mail 
            instance.
- `Logger.Levels` An enum object contains number from `1` - `4`
    - `DEBUG`
    - `INFO`
    - `WARN`
    - `ERROR`

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
    mail: { // must set all neccesary properties.
        subject: "Logs of My Website"
        host: "smtp.mail.qq.com",
        port: 25,
        from: "xxxxxxxx@qq.com",
        to: "xxxxxxxx@qq.com",
        auth: {
            username: "xxxxxxxx@qq.com",
            password: "xxxxxxxx",
        }
    }
});
```

If you don't set the `mail` option, when file's size up to limit, its contents 
will be compressed to a GZip file and stored in a directory named according to
date.

## Familiar Methods

- `logger.log()` Logs a message on DEBUG level (alias `logger.debug()`).
- `logger.info()` Logs a message on INFO level.
- `logger.warn()` Logs a message on WARN level.
- `logger.error()` Logs a message on ERROR level.

These methods' usage are exactly the same as `console`'s, if you're not 
familiar with them, please check 
[https://nodejs.org/dist/latest-v8.x/docs/api/console.html](https://nodejs.org/dist/latest-v8.x/docs/api/console.html).

## Multi-Processing Scenario

Powered by [open-channel](https://github.com/hyurl/open-channel), this package 
is safe in multi-processing scenario, and automatically prevent concurrency 
conflicts.

## Close Logger

You can called the method `logger.close()` to close the logger, however, due to 
using *open-channel*, which serves an internal IPC server that cannot be closed,
the program will not be able to exit automatically as usual, you have to 
explicitly calling `process.exit()` in case to terminate the program.

```javascript
// close the logger and terminate the program.
logger.close(() => {
    process.exit();
});
```