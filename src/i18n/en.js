/**
 * English dictionary. Keys must mirror `pl.js` exactly — `test/i18n.test.mjs`
 * checks parity in both directions.
 *
 * Thresholds, units and journal names are intentionally identical to the
 * Polish values: they are data, not prose.
 */
export default {
  // ------------------------------------------------------------- shell --
  'shell.loading': 'Loading the page',
  'shell.loadingBody': 'Preparing the experience...',
  'shell.retry': 'Try again',
  'shell.progress.loading': 'Loading the page...',
  'shell.progress.preparing': 'Preparing the page...',
  'shell.progress.almost': 'Almost ready...',
  'shell.errorTitle': 'Page unavailable',
  'shell.ready': 'Page ready',

  // ------------------------------------------------------ language toggle --
  'toggle.toEnglish': 'Switch to English',
  'toggle.toPolish': 'Switch to Polish',

  // ---------------------------------------------------------- intro cues --
  'intro.cue.01': 'Identifying the casualty',
  'intro.cue.02': 'Thermal camera test',
  'intro.cue.03': 'Infrared camera test',
  'intro.cue.04': 'Scanning the surroundings',

  // ------------------------------------------------------------- header --
  'header.brandLabel': 'AirTriage — back to start',
  'header.navLabel': 'Page sections',
  'nav.examples': 'Our examples',
  'nav.operator': 'Operator view',
  'nav.algorithm': 'Algorithm',

  // ----------------------------------------------------------- examples --
  'examples.title': 'Our examples',
  'examples.labelA': 'Example A',
  'examples.labelB': 'Example B',
  'examples.captionA': 'AirTriage drone demo — Glinek',
  'examples.captionB': 'AirTriage bpm demo — Glinek',
  'examples.playA': 'Play example video A: AirTriage drone demo',
  'examples.playB': 'Play example video B: AirTriage bpm demo',
  'examples.playBadge': 'Play video',

  // ------------------------------------------------------ operator view --
  'operator.title': 'Operator view',
  'operator.lead':
    'The view shows four selected people in order to clearly present the mechanism of marking, selecting and expanding data in the operator panel. The colours follow the triage assumptions and show warnings for verified parameters. The scientific basis is in the Algorithm tab.',
  'operator.filmLabel':
    'Interactive film. Drag right to move the film forward, or left to rewind it.',
  'operator.overlayLabel': 'Operator panel with four selected people',
  'operator.badge': 'Preview view',
  'operator.hint': 'Drag to analyse',
  'operator.fallback': 'The interactive film is temporarily unavailable.',

  // ------------------------------------------------------ operator panel --
  'panel.heading': 'People in the scenario',
  'panel.count': '4 selected',
  'panel.outOfFrame': 'Out of frame',
  'panel.selectOnFilm': 'Select {name} on the film',
  'panel.unavailable': 'The operator scenario is unavailable. The film can still be watched.',
  'panel.trackingLabel': 'Markers for the four selected people on the film',

  // ----------------------------------------------------------- algorithm --
  'algorithm.title': 'Algorithm',
  'algorithm.lead':
    'AirTriage organises remote observation of a person and points the operator to the measurement that needs attention. The demonstrator analyses movement, heart rate (HR) and respiratory rate (RR), but it does not replace the rescuer\u2019s decision or full medical triage.',
  'algorithm.panelLabel': 'Demonstrator algorithm',
  'algorithm.panelTitle': 'From detection to a readable signal',
  'algorithm.step1.title': 'Person detected',
  'algorithm.step1.body': 'The operator points the camera and steadies the frame.',
  'algorithm.step2.title': '30 seconds of observation',
  'algorithm.step2.body': 'The system assesses movement and collects HR and RR in parallel.',
  'algorithm.step3.title': 'Reliability check',
  'algorithm.step3.body': 'Only an available, stable measurement can raise an alarm.',
  'algorithm.outcomesLabel': 'Possible algorithm outcomes',
  'algorithm.red.status': 'Red',
  'algorithm.red.title': 'Check urgently',
  'algorithm.red.lead': 'Reliable measurement: ',
  'algorithm.red.hr': 'HR ≤40 or ≥131/min',
  'algorithm.red.mid': ', or ',
  'algorithm.red.rr': 'RR ≤8 or ≥25/min',
  'algorithm.red.end': '.',
  'algorithm.yellow.status': 'Yellow',
  'algorithm.yellow.title': 'Check or measure again',
  'algorithm.yellow.body':
    'No reading, movement disturbing the measurement, or an intermediate result: HR 41–50 / 91–130 or RR 9–11 / 21–24.',
  'algorithm.green.status': 'Green',
  'algorithm.green.title': 'No alarm in the measurements',
  'algorithm.green.lead': 'Both measurements are available: ',
  'algorithm.green.hr': 'HR 51–90/min',
  'algorithm.green.mid': ' and ',
  'algorithm.green.rr': 'RR 12–20/min',
  'algorithm.green.end': '. This does not mean “healthy person”.',
  'algorithm.note.lead': 'Red takes priority over yellow and green.',
  'algorithm.note.rest':
    'Only when there is no reliable red alarm does a missing reading or an intermediate result lead to yellow; green requires both available measurements without deviations. A red alarm may appear before the observation ends.',

  // ------------------------------------------------------------ evidence --
  'evidence.headingLabel': 'Scientific basis',
  'evidence.headingTitle': 'Scientific support',
  'evidence.1.title': 'HR and RR thresholds',
  'evidence.1.body':
    'The red, yellow and no-deviation bands follow NEWS2 — an early warning system for adults. This does not mean AirTriage is validated as a triage system.',
  'evidence.1.link': 'Royal College of Physicians report',
  'evidence.2.title': 'Contactless parameter measurement',
  'evidence.2.body':
    'A study of algorithms for drone-based triage analysed 13-second HR windows and 15-second RR windows, and identified movement and measurement conditions as significant limitations.',
  'evidence.2.link': 'Tayfur et al., 2026',
  'evidence.3.title': 'Observation time',
  'evidence.3.body':
    'Thirty seconds matches the length of the recordings used in a field study of semi-automatic categorisation with UAVs. The 35–40 second target for the whole workflow remains an assumption to be measured.',
  'evidence.3.link': 'Mösch et al., 2024',
  'evidence.4.index': '04 / Clinical context',
  'evidence.4.title': 'The result needs interpretation',
  'evidence.4.body':
    'An elevated heart rate can also result from exertion. HR alone cannot distinguish physical activity from injury or a deteriorating condition.',
  'evidence.4.link': 'American Heart Association',

  // --------------------------------------------------------------- scope --
  'scope.label': 'Demonstrator scope',
  'scope.title': 'POC scope',
  'scope.body':
    'The colours are a proposal for the AirTriage interface. The demonstrator does not compute full NEWS2, START or MITT; it does not assess bleeding, response to voice, or a medical category based on temperature.',
}