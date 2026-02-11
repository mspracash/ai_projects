import { normalize } from "./normalize.js";
import { SAMPLES } from "./samples.js";

for (const input of SAMPLES) {
  console.log("INPUT:");
  console.log(input);
  console.log("OUTPUT:");
  console.log(await normalize(input));
  console.log("---------------");
}
