import { Groq } from 'groq-sdk';

// Inicializar o cliente Groq com a chave da API
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export { groq };
