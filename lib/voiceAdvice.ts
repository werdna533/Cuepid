/**
 * RAG-based Voice Advice System
 * Provides personalized communication advice based on user weaknesses
 */

export interface AdviceCategory {
  topic: string;
  sources: string[];
  advice: string[];
  exercises: string[];
}

/**
 * Knowledge base for communication advice
 * In production, this would be retrieved from a vector database
 */
const COMMUNICATION_KNOWLEDGE_BASE: Record<string, AdviceCategory> = {
  confidence: {
    topic: "Building Confidence in Conversation",
    sources: [
      "How to Win Friends and Influence People - Dale Carnegie",
      "The Charisma Myth - Olivia Fox Cabane",
      "Crucial Conversations - Patterson et al.",
    ],
    advice: [
      "Prepare key talking points before important conversations, but don't over-script.",
      "Practice power poses for 2 minutes before conversations to boost testosterone and reduce cortisol.",
      "Use the 'expand and contract' technique: lean slightly forward when making important points.",
      "Replace filler words with strategic pauses - silence conveys confidence.",
      "Maintain comfortable eye contact (60-70% of the time) to project assurance.",
    ],
    exercises: [
      "Record yourself answering common questions and listen back for hesitation patterns.",
      "Practice the '3-second rule': wait 3 seconds before responding to show thoughtfulness.",
      "Do daily affirmations focused on your communication strengths.",
      "Practice speaking in front of a mirror, progressively increasing duration.",
    ],
  },
  empathy: {
    topic: "Developing Empathetic Communication",
    sources: [
      "Nonviolent Communication - Marshall Rosenberg",
      "Emotional Intelligence 2.0 - Bradberry & Greaves",
      "The Art of Empathy - Karla McLaren",
    ],
    advice: [
      "Use 'reflection' by restating what the other person said in your own words.",
      "Acknowledge emotions explicitly: 'It sounds like you're feeling frustrated.'",
      "Ask 'How did that make you feel?' to show genuine interest in their experience.",
      "Avoid immediately jumping to solutions - sometimes people need to be heard first.",
      "Practice perspective-taking: imagine the situation from their point of view.",
    ],
    exercises: [
      "After each conversation, write down 3 emotions you think the other person felt.",
      "Practice the 'reflection challenge': summarize what someone said before responding.",
      "Watch movies with subtitles off and try to identify characters' emotions.",
      "Keep an empathy journal noting when you successfully connected with someone's feelings.",
    ],
  },
  initiative: {
    topic: "Taking Conversational Initiative",
    sources: [
      "Never Split the Difference - Chris Voss",
      "The Fine Art of Small Talk - Debra Fine",
      "Conversationally Speaking - Alan Garner",
    ],
    advice: [
      "Prepare open-ended questions that invite elaboration (start with 'What', 'How', 'Tell me about').",
      "Use the 'Yes, and...' technique from improv to build on topics.",
      "Introduce related personal stories to encourage reciprocal sharing.",
      "Notice conversation 'hooks' - interesting details you can ask follow-up questions about.",
      "Don't be afraid to change topics if one is stalling - smooth transitions show social skill.",
    ],
    exercises: [
      "Before social events, prepare 5 interesting questions you'd genuinely like answered.",
      "Practice the 'newspaper technique': stay informed on current events for easy conversation starters.",
      "Challenge yourself to extend conversations by at least 3 exchanges in everyday interactions.",
      "Join a Toastmasters or improv class to practice conversational flexibility.",
    ],
  },
  clarity: {
    topic: "Speaking with Clarity and Impact",
    sources: [
      "Talk Like TED - Carmine Gallo",
      "Made to Stick - Chip & Dan Heath",
      "The Elements of Style - Strunk & White",
    ],
    advice: [
      "Use the PREP format: Point, Reason, Example, Point - for structured responses.",
      "Avoid jargon and complex words when simpler ones work.",
      "Break long explanations into numbered steps or bullet points.",
      "Summarize your main point at the end of longer explanations.",
      "Use concrete examples and analogies to illustrate abstract concepts.",
    ],
    exercises: [
      "Practice explaining complex topics to someone unfamiliar with them.",
      "Record yourself and identify redundant words or phrases.",
      "Play the 'headline game': summarize any story in one sentence.",
      "Practice the 'elevator pitch' for various topics - explain anything in 30 seconds.",
    ],
  },
  engagement: {
    topic: "Creating Engaging Conversations",
    sources: [
      "The Art of Conversation - Judy Apps",
      "How to Talk to Anyone - Leil Lowndes",
      "The Definitive Book of Body Language - Pease & Pease",
    ],
    advice: [
      "Match the energy level of your conversation partner.",
      "Show active engagement through nodding, verbal acknowledgments, and facial expressions.",
      "Share relevant personal experiences to create connection.",
      "Use humor appropriately to lighten mood and build rapport.",
      "Be genuinely curious - people can tell when you're actually interested.",
    ],
    exercises: [
      "Practice mirroring body language subtly in conversations.",
      "Set a goal to make at least one person laugh in every conversation.",
      "After conversations, reflect on moments when you felt most connected.",
      "Practice the 'FORD' technique: discuss Family, Occupation, Recreation, Dreams.",
    ],
  },
  fillers: {
    topic: "Reducing Filler Words",
    sources: [
      "Well Said! - Darlene Price",
      "The Quick and Easy Way to Effective Speaking - Dale Carnegie",
      "Speak Like Churchill, Stand Like Lincoln - James Humes",
    ],
    advice: [
      "Replace filler words with brief pauses - silence is more powerful than 'um'.",
      "Slow your speaking pace slightly to give yourself time to think.",
      "Start sentences with strong words, not fillers.",
      "Accept that natural pauses are completely normal and expected.",
      "Record yourself regularly to build awareness of your filler patterns.",
    ],
    exercises: [
      "Practice the 'pause-think-speak' pattern: pause, gather thoughts, then respond.",
      "Have a conversation where you consciously replace each 'um' with silence.",
      "Use a filler-word counter app for a week to build awareness.",
      "Practice answering questions extemporaneously with a focus on clean speech.",
    ],
  },
};

/**
 * Get personalized advice based on user weaknesses
 */
export function getPersonalizedAdvice(
  weaknesses: string[],
  metrics?: { fillerFrequency?: number; wpm?: number }
): {
  advice: string[];
  exercises: string[];
  sources: string[];
} {
  const result = {
    advice: [] as string[],
    exercises: [] as string[],
    sources: [] as string[],
  };

  // Map weakness names to knowledge base keys
  const weaknessMapping: Record<string, string> = {
    Confidence: "confidence",
    "Speech Smoothness": "confidence",
    Empathy: "empathy",
    Initiative: "initiative",
    Clarity: "clarity",
    Engagement: "engagement",
  };

  // Add advice for high filler frequency
  if (metrics?.fillerFrequency && metrics.fillerFrequency > 10) {
    const fillerAdvice = COMMUNICATION_KNOWLEDGE_BASE.fillers;
    result.advice.push(...fillerAdvice.advice.slice(0, 2));
    result.exercises.push(...fillerAdvice.exercises.slice(0, 1));
    result.sources.push(...fillerAdvice.sources.slice(0, 1));
  }

  // Add advice for each weakness
  for (const weakness of weaknesses) {
    const key = weaknessMapping[weakness];
    if (key && COMMUNICATION_KNOWLEDGE_BASE[key]) {
      const category = COMMUNICATION_KNOWLEDGE_BASE[key];
      result.advice.push(...category.advice.slice(0, 2));
      result.exercises.push(...category.exercises.slice(0, 1));
      result.sources.push(...category.sources.slice(0, 1));
    }
  }

  // Deduplicate
  result.advice = [...new Set(result.advice)].slice(0, 5);
  result.exercises = [...new Set(result.exercises)].slice(0, 4);
  result.sources = [...new Set(result.sources)].slice(0, 3);

  return result;
}

/**
 * Get specific drill for a weakness
 */
export function getDrillForWeakness(weakness: string): string[] {
  const weaknessMapping: Record<string, string> = {
    Confidence: "confidence",
    "Speech Smoothness": "confidence",
    Empathy: "empathy",
    Initiative: "initiative",
    Clarity: "clarity",
    Engagement: "engagement",
  };

  const key = weaknessMapping[weakness];
  if (key && COMMUNICATION_KNOWLEDGE_BASE[key]) {
    return COMMUNICATION_KNOWLEDGE_BASE[key].exercises;
  }

  return ["Practice mindful communication: focus fully on each conversation."];
}

/**
 * Generate next conversation goal based on performance
 */
export function generateNextGoal(
  weaknesses: string[],
  previousGoal?: string
): string {
  const goals: Record<string, string[]> = {
    Confidence: [
      "Speak for at least 5 seconds before your first pause",
      "Make at least 3 declarative statements without hedging",
      "End the conversation feeling proud of your delivery",
    ],
    Empathy: [
      "Use at least 2 reflective statements during the conversation",
      "Acknowledge the other person's feelings explicitly at least once",
      "Ask about how something made them feel",
    ],
    Initiative: [
      "Ask at least 4 follow-up questions",
      "Introduce a new topic organically",
      "Share a relevant personal story",
    ],
    Clarity: [
      "Complete all your sentences without trailing off",
      "Use concrete examples when explaining something",
      "Summarize your main point at least once",
    ],
    Engagement: [
      "Make the other person laugh at least once",
      "Share something personal that relates to their experience",
      "Keep all responses at least 3 sentences long",
    ],
  };

  const primaryWeakness = weaknesses[0];
  const goalOptions = goals[primaryWeakness] || goals.Engagement;

  // Pick a goal that's different from the previous one
  const availableGoals = goalOptions.filter((g) => g !== previousGoal);
  return availableGoals[0] || goalOptions[0];
}
