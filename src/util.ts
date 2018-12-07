import * as os from "os";

export function send(time: number, log: string) {
    return JSON.stringify([time, log]) + os.EOL;
}

export function receive(buf: Buffer): [number, string][] {
    let packs = [];

    buf.toString().split(os.EOL).forEach(pack => {
        pack && packs.push(JSON.parse(pack));
    });

    return packs;
}