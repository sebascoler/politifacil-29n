const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'public', 'data', 'electionData.js');
if (!fs.existsSync(dataPath)) {
  console.error('ERROR: No existe', dataPath);
  process.exit(1);
}

const data = require(dataPath);

const EXPECTED_PARTIES = ['podemos', 'frente-amplio', 'psoe', 'pp', 'vox', 'salf'];
const EXPECTED_AXES = [
  'vivienda',
  'economia',
  'empleo',
  'servicios',
  'territorial',
  'seguridad',
  'ecologia',
  'regeneracion',
];

function assert(cond, msg) {
  if (!cond) {
    console.error('VALIDATION FAILED:', msg);
    process.exit(1);
  }
}

assert(Array.isArray(data.parties) && data.parties.length === 6, 'Debe haber exactamente 6 partidos estatales');
EXPECTED_PARTIES.forEach((pid) => {
  const p = data.parties.find((x) => x.id === pid);
  assert(p, `Falta el partido ${pid}`);
  assert(p.officialUrl && p.officialUrl.startsWith('http'), `URL oficial inválida en ${pid}`);
  assert(p.officialCommunication && Array.isArray(p.officialCommunication.slogans) && p.officialCommunication.slogans.length > 0, `Faltan eslóganes en ${pid}`);
  assert(p.interviewStyle && p.interviewStyle.summary, `Falta interviewStyle en ${pid}`);
  EXPECTED_AXES.forEach((ax) => {
    assert(p.proposals && p.proposals[ax], `Falta eje ${ax} en ${pid}`);
    assert(p.proposals[ax].headline && Array.isArray(p.proposals[ax].points) && p.proposals[ax].points.length >= 2, `Propuestas insuficientes en ${pid}.${ax}`);
  });
});

assert(Array.isArray(data.territorialParties) && data.territorialParties.length >= 5, 'Debe haber al menos 5 partidos territoriales');

EXPECTED_AXES.forEach((ax) => {
  assert(data.axisComparisons && data.axisComparisons[ax], `Falta axisComparisons para ${ax}`);
  assert(data.axisComparisons[ax].similarities.length >= 2, `Faltan similitudes en ${ax}`);
  assert(data.axisComparisons[ax].differences.length >= 2, `Faltan diferencias en ${ax}`);
});

assert(Array.isArray(data.interviews) && data.interviews.length >= 18, `Se requieren al menos 18 extractos de entrevistas (actual: ${data.interviews?.length})`);
data.interviews.forEach((iv, i) => {
  assert(iv.candidate && iv.media && iv.formatType && iv.questionContext && iv.quote && iv.expressionStyle && iv.sourceUrl, `Entrevista #${i} incompleta`);
});

assert(Array.isArray(data.quizQuestions) && data.quizQuestions.length === 10, `Debe haber exactamente 10 preguntas tipo escenario (actual: ${data.quizQuestions?.length})`);
data.quizQuestions.forEach((q, qi) => {
  assert(Array.isArray(q.options) && q.options.length === 5, `Pregunta #${qi + 1} debe tener 5 opciones`);
  q.options.forEach((o, oi) => {
    assert(typeof o.spectrumScore === 'number' && o.spectrumScore >= 0 && o.spectrumScore <= 100, `spectrumScore inválido en P${qi + 1}.O${oi + 1}`);
    assert(o.partyAlignment && typeof o.partyAlignment === 'object', `Falta partyAlignment en P${qi + 1}.O${oi + 1}`);
  });
});

// Simular 5 perfiles de prueba (extremo izq, centro-izq, centro, centro-der, extremo der)
function simulateProfile(optIndex) {
  let sum = 0;
  data.quizQuestions.forEach((q) => {
    sum += q.options[optIndex].spectrumScore;
  });
  return sum / data.quizQuestions.length;
}

const scores = [0, 1, 2, 3, 4].map(simulateProfile);
console.log('Perfiles simulados (0->4):', scores.map((s) => s.toFixed(1)));
assert(scores[0] < 20 && scores[1] < 45 && scores[2] >= 40 && scores[2] <= 62 && scores[3] > 58 && scores[4] > 80, 'La calibración izquierda->derecha del test no es monotónica o está desajustada');

console.log('VALIDACIÓN COMPLETADA CON ÉXITO:', {
  parties: data.parties.length,
  territorialParties: data.territorialParties.length,
  axes: data.axes.length,
  interviews: data.interviews.length,
  quizQuestions: data.quizQuestions.length,
});
