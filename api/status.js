import { send, passedGate } from './_util.js';

// Tells the page whether the evaluation is set up, without revealing any key.
export default function handler(req, res) {
  send(res, 200, {
    evaluate: !!process.env.ANTHROPIC_API_KEY,
    needsCode: !!process.env.ACCESS_CODE && !passedGate(req),
  });
}
