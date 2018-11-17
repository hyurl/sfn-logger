"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
function send(time, log) {
    return JSON.stringify([time, log]) + os.EOL;
}
exports.send = send;
function receive(buf) {
    let packs = [];
    buf.toString().split(os.EOL).forEach(pack => {
        pack && packs.push(JSON.parse(pack));
    });
    return packs;
}
exports.receive = receive;
//# sourceMappingURL=util.js.map