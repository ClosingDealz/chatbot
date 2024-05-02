require('dotenv').config();
const express = require('express');

const hostname = process.env.HOSTNAME || "localhost";
const port = process.env.PORT || 4069;

const app = express();
app.use(express.json());

app.get('/', async (req, res) => {
    res.json({ "test": "hello world" });
});

app.listen(port, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});