const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

class AiService {

  static async extractResumeData(resumeText) {
    try {
      const prompt = `
You are a resume parser. Extract information from the resume text below and return ONLY a valid JSON object with no extra text, no markdown, no code blocks.

Required format:
{
  "skills": ["skill1", "skill2"],
  "education": ["degree and institution"],
  "experience": ["job title and company"],
  "summary": "2-3 sentence professional summary"
}

Resume text:
${resumeText}
      `.trim();

      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 800,
      });

      const raw = response.choices[0].message.content.trim();

      const cleaned = raw.replace(/```json|```/g, '').trim();

      const parsed = JSON.parse(cleaned);

      return {
        skills:     Array.isArray(parsed.skills)       ? parsed.skills     : [],
        education:  Array.isArray(parsed.education)    ? parsed.education  : [],
        experience: Array.isArray(parsed.experience)   ? parsed.experience : [],
        summary:    typeof parsed.summary === 'string' ? parsed.summary    : '',
      };

    } catch (err) {
      console.error('AI extraction error:', err.message);

      return {
        skills:     [],
        education:  [],
        experience: [],
        summary:    '',
      };
    }
  }
}

module.exports = AiService;