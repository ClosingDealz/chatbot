require('dotenv').config();
const express = require('express');
const crm = require('./services/crm');

const hostname = process.env.HOSTNAME || "localhost";
const port = process.env.PORT || 4069;

const app = express();
app.use(express.json());

app.get('/', async (req, res) => {
    res.json({ "test": "hello world" });
});

app.post('/lead', async (req, res) => {
    const data = req.body;
    const response = await crm.createLead(data.project, data.description, data.name, data.email, data.phone);

    res.json(response);
});

app.listen(port, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});