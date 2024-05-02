require('dotenv').config();
const express = require('express');
const crm = require('./services/crm');
const assistant = require('./services/assistant');

const hostname = process.env.HOSTNAME || "localhost";
const port = process.env.PORT || 4069;

const app = express();
app.use(express.json());

app.post('/start-thread', async (req, res) => {
    const thread = await assistant.startNewThread();
    res.json({ "threadId": thread.id });
});


app.post('/lead', async (req, res) => {
    const data = req.body;
    const response = await crm.createLead(data.project, data.description, data.name, data.email, data.phone);

    res.json(response);
});

app.listen(port, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});