/* ============================================================
   Heart Risk Analyzer — main.js
   ============================================================ */

/* ---------- Tab switching ---------- */
function switchTab(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  event.target.classList.add('active');
}

/* ---------- Animate charts on page load ---------- */
window.addEventListener('load', () => {
  setTimeout(() => {
    // Animate bar charts
    document.querySelectorAll('.bar-fill[data-w]').forEach(el => {
      el.style.width = el.dataset.w;
    });

    // Animate donut chart (SVG stroke-dasharray trick)
    const circ      = 2 * Math.PI * 46;           // circumference of r=46 circle
    const maleRatio = 207 / 303;
    const maleDash  = maleRatio * circ;
    const femDash   = (1 - maleRatio) * circ;

    const maleEl   = document.getElementById('donut-male');
    const femaleEl = document.getElementById('donut-female');

    setTimeout(() => {
      maleEl.setAttribute('stroke-dasharray', `${maleDash} ${circ - maleDash}`);
      maleEl.style.transition = 'stroke-dasharray 1s ease';

      femaleEl.setAttribute('stroke-dasharray', `${femDash} ${circ - femDash}`);
      femaleEl.setAttribute('stroke-dashoffset', `-${maleDash}`);
      femaleEl.style.transition = 'stroke-dasharray 1s ease';
    }, 200);
  }, 100);
});

/* ---------- Risk score calculation ---------- */
function calcRiskScore(d) {
  let score = 0;

  // Age
  const age = parseInt(d.age);
  if      (age >= 60) score += 20;
  else if (age >= 50) score += 15;
  else if (age >= 40) score += 8;
  else                score += 3;

  // Sex (male = higher risk)
  if (d.sex === '1') score += 5;

  // Chest pain type
  const cpScore = [12, 6, 4, 2];
  score += cpScore[parseInt(d.cp)];

  // Blood pressure
  const bp = parseInt(d.trestbps);
  if      (bp >= 160) score += 12;
  else if (bp >= 140) score += 8;
  else if (bp >= 130) score += 4;

  // Cholesterol
  const chol = parseInt(d.chol);
  if      (chol >= 300) score += 10;
  else if (chol >= 240) score += 6;
  else if (chol >= 200) score += 3;

  // Fasting blood sugar
  if (d.fbs === '1') score += 5;

  // Max heart rate (lower = higher risk)
  const hr = parseInt(d.thalach);
  if      (hr < 100) score += 12;
  else if (hr < 130) score += 7;
  else if (hr < 150) score += 3;

  // Exercise angina
  if (d.exang === '1') score += 10;

  // Oldpeak (ST depression)
  const op = parseFloat(d.oldpeak);
  if      (op >= 3) score += 10;
  else if (op >= 2) score += 7;
  else if (op >= 1) score += 4;

  // Slope (0 = downsloping = highest risk)
  const slopeScore = [8, 4, 1];
  score += slopeScore[parseInt(d.slope)];

  // Number of major vessels
  score += parseInt(d.ca) * 8;

  // Thalassemia
  const thalScore = [0, 6, 2, 8];
  score += thalScore[parseInt(d.thal)];

  return Math.min(100, Math.max(0, score));
}

/* ---------- Collect form values ---------- */
function getFormData() {
  return {
    age:      document.getElementById('f-age').value,
    sex:      document.getElementById('f-sex').value,
    cp:       document.getElementById('f-cp').value,
    trestbps: document.getElementById('f-trestbps').value,
    chol:     document.getElementById('f-chol').value,
    fbs:      document.getElementById('f-fbs').value,
    restecg:  document.getElementById('f-restecg').value,
    thalach:  document.getElementById('f-thalach').value,
    exang:    document.getElementById('f-exang').value,
    oldpeak:  document.getElementById('f-oldpeak').value,
    slope:    document.getElementById('f-slope').value,
    ca:       document.getElementById('f-ca').value,
    thal:     document.getElementById('f-thal').value,
  };
}

/* ---------- Render analysis cards ---------- */
function renderAnalysisCards(d) {
  const cpLabels = ['Typical Angina', 'Atypical Angina', 'Non-anginal Pain', 'Asymptomatic'];
  const age = parseInt(d.age);

  const items = [
    { label: 'อายุ',            value: age + ' ปี',           status: age >= 55 ? '⚠️ ปัจจัยเสี่ยงสูง' : '✓ ปกติ' },
    { label: 'ความดัน',         value: d.trestbps + ' mmHg',  status: parseInt(d.trestbps) >= 140 ? '⚠️ สูง' : '✓ ปกติ' },
    { label: 'คอเลสเตอรอล',     value: d.chol + ' mg/dl',     status: parseInt(d.chol) >= 240 ? '⚠️ สูง' : '✓ ปกติ' },
    { label: 'Max Heart Rate',  value: d.thalach + ' bpm',    status: parseInt(d.thalach) < 130 ? '⚠️ ต่ำ' : '✓ ปกติ' },
    { label: 'Chest Pain',      value: cpLabels[parseInt(d.cp)], status: d.cp === '0' ? '⚠️ เสี่ยงสูง' : '✓ เสี่ยงน้อย' },
    { label: 'Exercise Angina', value: d.exang === '1' ? 'มี' : 'ไม่มี', status: d.exang === '1' ? '⚠️ พบอาการ' : '✓ ไม่มีอาการ' },
  ];

  document.getElementById('analysis-grid').innerHTML = items.map(i => `
    <div class="analysis-item">
      <div class="analysis-item-label">${i.label}</div>
      <div class="analysis-item-value">${i.value}</div>
      <div class="analysis-item-status" style="color:${i.status.startsWith('⚠️') ? 'var(--warn)' : 'var(--good)'}">
        ${i.status}
      </div>
    </div>
  `).join('');
}

/* ---------- Fallback AI response (no network) ---------- */
function fallbackResponse(d, score, level) {
  const cpLabels   = ['Typical Angina', 'Atypical Angina', 'Non-anginal Pain', 'Asymptomatic'];
  const slopeLabels = ['Downsloping ⚠️', 'Flat', 'Upsloping ✓'];
  const thalLabels  = ['Normal', 'Fixed Defect ⚠️', 'Normal', 'Reversable Defect ⚠️'];

  const texts = {
    low: `จากข้อมูลที่ได้รับ ความเสี่ยงโรคหัวใจอยู่ในระดับ${level} (คะแนน ${score}/100)\n\nปัจจัยเสี่ยงที่พบ:\n• อายุ ${d.age} ปี ซึ่งเป็นปัจจัยพื้นฐานที่ต้องติดตาม\n• ค่าคอเลสเตอรอล ${d.chol} mg/dl ควรรักษาระดับให้ปกติ\n\nคำแนะนำ: ถึงแม้ความเสี่ยงจะต่ำ แต่ควรออกกำลังกายสม่ำเสมอ รับประทานอาหารที่ดีต่อสุขภาพ และตรวจสุขภาพประจำปี\n\n⚠️ ผลนี้เป็นการประเมินเบื้องต้นเท่านั้น กรุณาปรึกษาแพทย์เพื่อการวินิจฉัยที่แม่นยำ`,

    moderate: `จากข้อมูลที่ได้รับ ความเสี่ยงโรคหัวใจอยู่ในระดับ${level} (คะแนน ${score}/100)\n\nปัจจัยเสี่ยงหลักที่พบ:\n• ระดับคอเลสเตอรอล ${d.chol} mg/dl ${parseInt(d.chol) >= 240 ? '(สูงกว่าปกติ)' : ''}\n• ความดันโลหิต ${d.trestbps} mmHg ${parseInt(d.trestbps) >= 130 ? '(ควรติดตาม)' : ''}\n• ${d.exang === '1' ? 'พบอาการเจ็บหน้าอกเมื่อออกกำลังกาย' : 'ไม่พบอาการเจ็บหน้าอก'}\n\nคำแนะนำ: ควรปรับพฤติกรรมการใช้ชีวิต ลดอาหารไขมันสูง ออกกำลังกายสม่ำเสมอ และพบแพทย์เพื่อตรวจสุขภาพ\n\n⚠️ ผลนี้เป็นการประเมินเบื้องต้นเท่านั้น กรุณาปรึกษาแพทย์โดยเร็ว`,

    high: `จากข้อมูลที่ได้รับ ความเสี่ยงโรคหัวใจอยู่ในระดับ${level} (คะแนน ${score}/100)\n\nปัจจัยเสี่ยงสำคัญที่พบ:\n• ${d.ca > 0 ? `พบหลอดเลือดหัวใจอุดตัน ${d.ca} เส้น` : 'ควรตรวจหลอดเลือดหัวใจ'}\n• ${d.exang === '1' ? 'มีอาการเจ็บหน้าอกเมื่อออกกำลังกาย (สัญญาณเตือนสำคัญ)' : ''}\n• ${parseFloat(d.oldpeak) >= 2 ? `ST Depression สูง (${d.oldpeak} mm) บ่งบอกถึงการขาดเลือด` : ''}\n• ระดับคอเลสเตอรอล ${d.chol} mg/dl\n\nคำแนะนำ: ควรพบแพทย์โดยเร็วที่สุด อย่าละเลยอาการเจ็บหน้าอกหรือหายใจลำบาก\n\n🚨 ผลนี้เป็นการประเมินเบื้องต้นเท่านั้น กรุณาพบแพทย์ผู้เชี่ยวชาญโรคหัวใจโดยด่วน`,
  };

  const key = score < 35 ? 'low' : score < 65 ? 'moderate' : 'high';
  return texts[key];
}

/* ---------- Call Claude API ---------- */
async function callClaudeAPI(d, score, level) {
  const cpLabels    = ['Typical Angina', 'Atypical Angina', 'Non-anginal Pain', 'Asymptomatic'];
  const slopeLabels = ['Downsloping ⚠️', 'Flat', 'Upsloping ✓'];
  const thalLabels  = ['Normal', 'Fixed Defect ⚠️', 'Normal', 'Reversable Defect ⚠️'];
  const sexLabel    = d.sex === '1' ? 'ชาย' : 'หญิง';

  const prompt = `คุณเป็นผู้เชี่ยวชาญด้านโรคหัวใจ วิเคราะห์ข้อมูลต่อไปนี้และประเมินความเสี่ยงโรคหัวใจเป็นภาษาไทย:

ข้อมูลผู้ป่วย:
- อายุ: ${d.age} ปี (เพศ${sexLabel})
- อาการเจ็บหน้าอก: ${cpLabels[parseInt(d.cp)]}
- ความดันโลหิต: ${d.trestbps} mmHg
- คอเลสเตอรอล: ${d.chol} mg/dl
- น้ำตาลในเลือด: ${d.fbs === '1' ? 'สูง (>120 mg/dl)' : 'ปกติ'}
- อัตราหัวใจสูงสุด: ${d.thalach} bpm
- เจ็บหน้าอกเมื่อออกกำลังกาย: ${d.exang === '1' ? 'มี' : 'ไม่มี'}
- Oldpeak: ${d.oldpeak}
- ST Slope: ${slopeLabels[parseInt(d.slope)]}
- จำนวนหลอดเลือด: ${d.ca} เส้น
- Thalassemia: ${thalLabels[parseInt(d.thal)]}

คะแนนความเสี่ยงประเมินได้: ${score}/100 (${level})

กรุณาวิเคราะห์โดย:
1. สรุปปัจจัยเสี่ยงหลักที่พบ (2-3 ข้อ)
2. อธิบายความหมายของผลลัพธ์
3. คำแนะนำเบื้องต้นสำหรับผู้ป่วย

ตอบสั้นๆ ชัดเจน ไม่เกิน 200 คำ และย้ำว่าควรปรึกษาแพทย์เสมอ`;

  const res  = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const json = await res.json();
  if (json.content && json.content[0]) return json.content[0].text;
  return 'ไม่สามารถวิเคราะห์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง';
}

/* ---------- Main prediction handler ---------- */
async function runPrediction() {
  const btn   = document.getElementById('btn-predict');
  btn.disabled = true;
  btn.textContent = '⏳ กำลังวิเคราะห์...';

  const d     = getFormData();
  const score = calcRiskScore(d);

  // Show result panel
  const panel = document.getElementById('result-panel');
  panel.classList.add('show');

  // Determine risk level
  let level, color;
  if      (score < 35) { level = 'ความเสี่ยงต่ำ';       color = 'risk-low'; }
  else if (score < 65) { level = 'ความเสี่ยงปานกลาง';   color = 'risk-moderate'; }
  else                 { level = 'ความเสี่ยงสูง';        color = 'risk-high'; }

  // Animate score counter
  const scoreEl = document.getElementById('result-score-big');
  let display   = 0;
  const interval = setInterval(() => {
    display = Math.min(score, display + 2);
    scoreEl.textContent = display;
    if (display >= score) clearInterval(interval);
  }, 20);

  // Move risk bar thumb
  setTimeout(() => {
    document.getElementById('risk-thumb').style.left = score + '%';
  }, 100);

  // Set badge
  const badge = document.getElementById('result-badge');
  badge.textContent  = level;
  badge.className    = 'result-risk-badge ' + color;

  // Render analysis cards
  renderAnalysisCards(d);

  // AI analysis
  const aiBox  = document.getElementById('ai-response');
  const loading = document.getElementById('loading-dots');
  aiBox.textContent = '';
  loading.style.display = 'inline-flex';

  try {
    aiBox.textContent = await callClaudeAPI(d, score, level);
  } catch {
    aiBox.textContent = fallbackResponse(d, score, level);
  } finally {
    loading.style.display = 'none';
  }

  btn.disabled    = false;
  btn.textContent = '🔍 วิเคราะห์ความเสี่ยง';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
