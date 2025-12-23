// test-server.js - Minimal test
const express = require('express');
const app = express();

// Only one route
app.get('/test', (req, res) => {
    res.json({ message: 'Test route works!' });
});

app.listen(5001, () => {
    console.log('Test server on http://localhost:5001');
    console.log('Test: http://localhost:5001/test');
});