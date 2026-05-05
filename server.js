const express = require('express');
const path = require('path');
const ImportancePerceptionAI = require('./engine');

const app = express();
const ai = new ImportancePerceptionAI();

app.use(express.json());
app.use('/static', express.static(path.join(__dirname, 'static')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/analyze', (req, res) => {
  const tasks = Array.isArray(req.body.tasks) ? req.body.tasks : [];
  if (!tasks.length) {
    return res.status(400).json({ success: false, message: 'Please provide a non-empty tasks array.' });
  }
  try {
    const analysis = ai.analyze(tasks);
    return res.json({ success: true, analysis });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Analysis failed.' });
  }
});

app.post('/api/feedback', (req, res) => {
  const { task_id, perceived_importance, actual_importance, comments } = req.body;
  if (!task_id || perceived_importance == null || actual_importance == null || !comments) {
    return res.status(400).json({ success: false, message: 'Missing required feedback fields.' });
  }
  const result = ai.submitFeedback({ task_id, perceived_importance, actual_importance, comments });
  return res.json({ success: true, feedback_summary: result });
});

const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log(`Importance Perception AI server running at http://localhost:${port}`);
});
