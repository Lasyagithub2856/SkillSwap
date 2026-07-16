import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API if key is present
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('Warning: GEMINI_API_KEY is not defined in .env. Using mock fallback services.');
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Parses raw text/bio to extract skills to teach and learn.
 * @param {string} rawText 
 * @returns {Promise<{skillsToTeach: Array, skillsToLearn: Array}>}
 */
export const parseProfileText = async (rawText) => {
  const genAI = getGeminiClient();
  
  if (!genAI) {
    // Return mock parsed results if API key is not present
    return mockParseProfile(rawText);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
      Analyze the following user bio, resume description, or introductory text. Extract two lists:
      1. 'skillsToTeach': Skills the user is proficient in and could teach others.
      2. 'skillsToLearn': Skills the user wants to learn.

      For each skill, determine:
      - 'name': Clean, standardized name (e.g. 'React', 'Python', 'French', 'Public Speaking').
      - 'category': An appropriate general category (e.g. 'Programming', 'Languages', 'Design', 'Marketing', 'Cooking', 'Music', 'Fitness').
      - 'level': One of 'Beginner', 'Intermediate', 'Expert'. For 'skillsToLearn', default to 'Beginner'.

      Text to analyze:
      """
      ${rawText}
      """

      Provide the response STRICTLY as a JSON object matching this schema:
      {
        "skillsToTeach": [{"name": "React", "category": "Programming", "level": "Expert"}],
        "skillsToLearn": [{"name": "French", "category": "Languages", "level": "Beginner"}]
      }
    `;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    });

    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Gemini API profile parsing failed, using fallback:', error);
    return mockParseProfile(rawText);
  }
};

/**
 * Generates an explanation/narrative on why two users are compatible.
 * @param {object} userA 
 * @param {object} userB 
 * @returns {Promise<string>}
 */
export const generateMatchExplanation = async (userA, userB) => {
  const genAI = getGeminiClient();
  if (!genAI) {
    return `You have complementary skills: ${userA.name} wants to learn ${userB.skillsToTeach.map(s => s.name).join(', ')} which ${userB.name} teaches.`;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
      You are an AI Matchmaker for "Skill Swap" - a platform where people teach and learn from each other.
      Analyze the details of two users:
      
      User 1: ${userA.name}
      - Skills they can teach: ${JSON.stringify(userA.skillsToTeach)}
      - Skills they want to learn: ${JSON.stringify(userA.skillsToLearn)}
      - Bio: "${userA.bio}"

      User 2: ${userB.name}
      - Skills they can teach: ${JSON.stringify(userB.skillsToTeach)}
      - Skills they want to learn: ${JSON.stringify(userB.skillsToLearn)}
      - Bio: "${userB.bio}"

      Write a concise, friendly 2-3 sentence explanation highlighting why they should swap skills. Be encouraging, highlighting exactly who teaches what to whom, and if they share general interests based on their bios.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Gemini Match explanation failed:', error);
    return `Direct Match: ${userA.name} can swap skills with ${userB.name} based on their listed profiles.`;
  }
};

// Fallback Mock Parser
const mockParseProfile = (text) => {
  const lowercaseText = text.toLowerCase();
  const skillsToTeach = [];
  const skillsToLearn = [];

  const categories = {
    Programming: ['react', 'node', 'javascript', 'python', 'java', 'html', 'css', 'coding', 'typescript', 'backend', 'frontend'],
    Languages: ['french', 'spanish', 'english', 'german', 'japanese', 'chinese'],
    Design: ['design', 'figma', 'ui', 'ux', 'photoshop', 'illustrator'],
    Music: ['guitar', 'piano', 'singing', 'music', 'drums'],
    Cooking: ['cooking', 'baking', 'italian cooking', 'chef']
  };

  // Find matches in text
  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      if (lowercaseText.includes(keyword)) {
        const name = keyword.charAt(0).toUpperCase() + keyword.slice(1);
        // Simple heuristic: if text mentions "learn" near the keyword or generally, assume it's to learn
        const learnIndex = lowercaseText.indexOf('learn');
        const keywordIndex = lowercaseText.indexOf(keyword);
        
        if (learnIndex !== -1 && Math.abs(learnIndex - keywordIndex) < 40) {
          if (!skillsToLearn.some(s => s.name === name)) {
            skillsToLearn.push({ name, category, level: 'Beginner' });
          }
        } else {
          if (!skillsToTeach.some(s => s.name === name)) {
            skillsToTeach.push({ name, category, level: 'Intermediate' });
          }
        }
      }
    }
  }

  // Add default placeholders if nothing is parsed
  if (skillsToTeach.length === 0) {
    skillsToTeach.push({ name: 'Web Development', category: 'Programming', level: 'Intermediate' });
  }
  if (skillsToLearn.length === 0) {
    skillsToLearn.push({ name: 'Figma', category: 'Design', level: 'Beginner' });
  }

  return { skillsToTeach, skillsToLearn };
};
