import dotenv from 'dotenv';
dotenv.config();

import { app } from './app';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`[HAQ API] Server listening on http://localhost:${PORT}`);
  console.log(`[HAQ API] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[HAQ API] Groq configured: ${Boolean(process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.startsWith('your_'))}`);
});
