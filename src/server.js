const express = require('express');

const hostname = "localhost";
const port = 4069;

const app = express();
app.use(express.json());

app.get('/', async (req, res) => {
    res.json({ "test": "hello world" });
});

app.listen(port, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});