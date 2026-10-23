import { send } from './_util.js';

// Tells the page which parts of the oral mode are set up, without revealing any key.
export default function handler(req, res) {
  send(res, 200, {
    transcribe: !!process.env.OPENAI_API_KEY,
    evaluate: !!process.env.ANTHROPIC_API_KEY,
    needsCode: !!process.env.ACCESS_CODE,
  });
}
