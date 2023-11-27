import { formatCode } from "../tasks/utils.ts";
import { toText } from "@std/streams";

const testCode = `
    import axios from 'axios'; import * as path from 'path';
    await axios.get('https://xkcd.com/info.0.json);
    console.log('done'  );
`;

const result = await toText(formatCode(testCode));

console.log("Formatted code:");
console.log('"', result, '"');
