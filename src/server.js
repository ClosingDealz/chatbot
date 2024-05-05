require('dotenv').config();
const express = require('express');
const crm = require('./services/crm');
const assistant = require('./services/assistant');

const hostname = process.env.HOSTNAME || "localhost";
const port = process.env.PORT || 4069;

const app = express();
app.use(express.json());

assistant.init();

app.post('/start-thread', async (req, res) => {
    const thread = await assistant.startNewThread();
    res.json({ "threadId": thread.id });
});

app.post('/chat', async (req, res) => {
    const data = req.body;
    const threadId = data.threadId;
    const userInput = data.message || '';
  
    if (!threadId) {
      console.error("Error: Missing 'threadId'");
      return res.status(400).json({ "error": "Missing 'threadId'" });
    }

    const response = await assistant.chat(userInput, threadId);
    res.json({ "response": response });
});

app.post('/lead', async (req, res) => {
    const data = req.body;
    const response = await crm.createLead(data);

    res.json(response);
});

app.listen(port, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});