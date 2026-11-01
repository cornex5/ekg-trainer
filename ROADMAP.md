# Roadmap

Open work, roughly in order. Items are goals, not promises.

## Next

- Have the English medical terms in the 41 cases and the grading prompt read by someone with clinical English (EMT, paramedic, physician level).
- Real-key test of the free-text grading with Claude. So far it ran only against a mocked API.
- Impressum and Datenschutz pages, needed before the site is opened to the public.

## Launch

- Open the site to the public: remove the access gate, keep the free access message on the landing page.
- Sign-up and registration, so progress can follow the user across devices (today it lives in the browser only).
- Per-visitor limits and a budget cap for the Claude grading, because every request costs API credit.

## Realism

- 12-lead depth: left bundle branch block currently has a QRS about 30 ms wider than typical (160 ms against 120 to 130 ms), and its ST segment in V1 to V3 is still negative.
- Acute infarct patterns cannot be checked against PTB-XL. Review them with clinicians.
- More cases and finer variants (pacemaker rhythms, more block types).

## Later, maybe

- Oral reading mode (speak the finding, transcription, Claude grading). A first version existed and was removed because the implementation was not good enough. It may be rebuilt.
- Windows desktop build. The website is the main path.

## Done

- Simulation of 41 cases with a heart-vector model, rhythm scheduler and 12-lead output.
- Four reading levels with wizard, step form and graded free text.
- Click-to-enlarge with mouse-wheel zoom, caliper, explanation layer, error-source training, live monitor.
- Landing page in the light clinical style, trainer under `/app/`, 50 mm/s default.
- Access gate for the whole site.
- Sidebar layout in the style of the landing page, flat sections (catalogue and error-source training stay as their own areas).
- German and English for the landing page, the trainer, all cases and the grading.
