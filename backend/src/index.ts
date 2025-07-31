// Backend entry point
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('Hello from Backend!');
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
