# EKG-Trainer

A website for practising ECG reading on simulated recordings. Every trace is generated in the browser from a heart-vector model projected onto 12 leads, so there is no stored patient data. The whole site (landing page, trainer, all 41 cases, grading) is available in German and English. The language follows the browser (English as fallback) and can be switched with the DE/EN button; the choice is remembered.

The live site is currently behind an access code while it is in development.

## Who it is for

Paramedic students and working paramedics, emergency physicians, residents, and anyone who wants structured ECG practice. The reading task adapts to four levels: Rettungssanitaeter, Notfallsanitaeter, Arzt, Experte.

## Features

- 41 cases in 8 categories: basic rhythms, bradycardias and blocks, tachycardias, extrasystoles, cardiac arrest rhythms, ischaemia, conduction disorders and hypertrophy, electrolytes, drugs and other findings.
- Display as 12-lead paper or as a monitor strip, 25 or 50 mm/s (50 is the default), adjustable gain and artefact level.
- Reading by level:
  - Rettungssanitaeter: guided wizard with decision questions.
  - Notfallsanitaeter: three-step form.
  - Arzt and Experte: free text, graded by Claude against the simulated ground truth, with a model report and a list of claims that do not match the case.
- Quiz and a 10-case blitz round, spaced repetition, progress kept in the browser (localStorage), nothing is sent to a server except the text you submit for grading.
- Caliper, optional case vignette, explanation layer that marks the relevant segments.
- Click-to-enlarge full view with mouse-wheel zoom.
- Error-source training: swapped electrodes, mains hum, baseline wander, muscle noise.
- Live monitor mode with a running rhythm that changes over time.
- Catalogue view with measured values per lead for every case.
- English level names: EMT, Paramedic, Physician, Expert (the German job titles are shown as a hint).

## Stack

- Vanilla JavaScript (ES modules), no framework. `esbuild` bundles `app.js` into a single HTML file.
- Static output in `dist/`: landing page at `/`, trainer at `/app/`.
- Vercel serverless functions in `api/` (`evaluate` calls the Anthropic Messages API with a forced tool call and returns a structured grade, `status` reports whether grading is configured).
- `middleware.js` is an edge middleware that puts the whole site behind `ACCESS_CODE`.

How the signal is made: `src/model.js` builds the heart vector for one beat, `src/rhythms.js` schedules beats (conduction, blocks, ectopy), `src/pathology.js` applies findings such as bundle branch blocks, ST changes and old infarcts, and `src/engine.js` returns 12 lead signals at 500 Hz. `src/render.js` draws paper and monitor views as SVG.

## Run locally

```
npm install
npm run build
npm run dev
```

`npm run dev` serves `dist/` and runs the `api/` functions on `http://localhost:3000`. Set `MOCK_EXTERNAL=1` to answer grading requests with a canned reply, so no API key is needed. `npm test` renders every case twice, checks the output is identical and finite, then runs the build. `npm run render` writes PNGs of all cases to `out/`.

## Environment variables

See `.env.example`.

| Name | Needed for | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | free-text grading | Without it the trainer works, only the Claude grading is disabled. |
| `CLAUDE_MODEL` | free-text grading | Optional, defaults to `claude-sonnet-5-5`. |
| `ACCESS_CODE` | site gate | Optional. When set, every page and API route asks for it (HTTP Basic, any user name). |

Keys are set as Vercel environment variables and are never part of the repository.

## Running without the access gate

Leave `ACCESS_CODE` unset, or delete `middleware.js`. Locally, `npm run dev` does not use the middleware. If you open the site to the public, add per-visitor limits to `api/evaluate.js` first, because every grading request costs API credit.

## Status

Working and deployed, not public. The simulation is calibrated against published summary figures from PTB-XL for normal ECGs and for bundle branch blocks. Acute infarct patterns follow textbook descriptions and could not be checked against real recordings. The Claude grading has so far been tested only with a mocked API. See [ROADMAP.md](ROADMAP.md) for what is planned.

Not a medical device. For education and training only, not for decisions about patients.

## History note

An early commit (`2544624`) contained an excerpt of 20 real ECGs from PTB-XL (CC BY 4.0, Wagner et al., PhysioNet, de-identified, 100 Hz) for a blind test "real or simulated". The excerpt and the blind test were removed later because the project is meant to run on simulated data only. The file, and the built `dist/` bundles that were committed in the first versions and embedded it, stay visible in the git history.

## Development

Most of the code was written with an AI coding assistant (Claude) at the author's direction. Early commits are attributed to Claude, later ones to cornex5. Commits carry a `Co-Authored-By` trailer.

## License and credits

Code: MIT, see [LICENSE](LICENSE).

Fonts are self-hosted from `@fontsource` and licensed under the SIL Open Font License 1.1 (texts in `fonts/`): Hanken Grotesk, DM Mono, IBM Plex Sans, IBM Plex Mono.

Reference statistics: Wagner P. et al., PTB-XL, a large publicly available electrocardiography dataset, Scientific Data 2020, https://physionet.org/content/ptb-xl/ (CC BY 4.0). Only summary figures were used; no recordings are shipped.
