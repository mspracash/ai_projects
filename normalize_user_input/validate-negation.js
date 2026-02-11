// validate-negation.js
const HARD_NEGATION = [
  /\bnot\b/i,
  /\bno\b/i,
  /\bnever\b/i,
  /\bcannot\b/i,
  /\bcan\'t\b/i,
  /\bdon\'t\b/i,
  /\bdoesn\'t\b/i,
  /\bdidn\'t\b/i,
  /\bisn\'t\b/i,
  /\baren\'t\b/i,
  /\bwasn\'t\b/i,
  /\bweren\'t\b/i,
  /\bwon\'t\b/i,
  /\bwouldn\'t\b/i,
  /\bshouldn\'t\b/i,
  /\bhaven\'t\b/i,
  /\bhasn\'t\b/i,
  /\bhadn\'t\b/i
];

export function validateNoNegations(text) {
  const hits = HARD_NEGATION.filter((re) => re.test(text));
  if (hits.length) {
    console.log(text);
    throw new Error("Negation detected in output");
  }
}
