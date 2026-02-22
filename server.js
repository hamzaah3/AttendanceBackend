/**
 * Local development server. Not used on Vercel (api/[...path].js is the entry).
 */
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Attendance API running at http://localhost:${PORT}`);
});
