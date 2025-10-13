
const express = require('express');
const cors = require('cors');
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Dummy routes for demonstration
app.get('/api/status', (req, res) => res.json({ status: 'API running' }));

app.listen(port, () => console.log(`Server listening on port ${port}`));
