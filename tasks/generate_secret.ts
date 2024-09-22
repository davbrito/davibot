import { encodeBase64, encodeHex } from "@std/encoding";

const SIZE = 42;

const buffer = new Uint8Array(SIZE);

crypto.getRandomValues(buffer);

console.log("hex:", encodeHex(buffer));
console.log("base64:", encodeBase64(buffer));
