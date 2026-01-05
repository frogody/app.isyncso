/**
 * Google Gemini API integration for AI-powered content generation
 */

/**
 * Calls the Google Gemini API to generate content.
 *
 * @param {object} params
 * @param {string} params.prompt - The prompt to send to the model.
 * @param {object} [params.response_json_schema] - The JSON schema for the expected response format.
 * @param {string} [params.model='gemini-3.0-pro'] - The Gemini model to use.
 * @param {number} [params.maxOutputTokens=8192] - The maximum number of tokens to generate.
 * @returns {Promise<string|object>} - The generated content, parsed as JSON if a schema is provided.
 */
export async function InvokeGemini({
  prompt,
  response_json_schema,
  model = 'gemini-3.0-pro',
  maxOutputTokens = 8192
}) {
  // Using Google AI Studio API key
  const apiKey = 'AIzaSyAQc2YIvQqMLt1D-RRjHfw6rzu7ST6pOLU';

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemInstruction = response_json_schema
    ? `You are Gemini 3, Google's most advanced AI model specialized in educational content creation and multimedia generation. Please respond ONLY with a valid JSON object that strictly adheres to the following schema. Do not include any explanatory text, markdown formatting, or other content - just pure JSON that validates against the schema.

Schema: ${JSON.stringify(response_json_schema, null, 2)}

Use your advanced multimodal capabilities to create comprehensive, engaging, and pedagogically excellent educational content. Ensure all required fields are present and all data types match exactly. Focus on creating content that would work well for video narration and visual presentation.`
    : "You are Gemini 3, Google's most advanced multimodal AI model specialized in educational content creation, video script generation, and interactive learning experiences. Use your superior reasoning abilities to provide clear, accurate, engaging, and pedagogically excellent responses that enhance the learning experience with deep insights and comprehensive coverage. Focus on content that translates well to video format.";

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: response_json_schema ? `${systemInstruction}\n\nUser Prompt: ${prompt}` : `${systemInstruction}\n\n${prompt}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: maxOutputTokens,
      responseMimeType: response_json_schema ? "application/json" : "text/plain"
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH", 
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      }
    ]
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Gemini API Error (${response.status}):`, errorBody);
      throw new Error(`Gemini API request failed: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      console.error('Unexpected Gemini API response structure:', data);
      throw new Error('Invalid response format from Gemini API');
    }

    const responseText = data.candidates[0].content.parts[0].text.trim();

    if (response_json_schema) {
      try {
        const parsedResult = JSON.parse(responseText);
        return parsedResult;
      } catch (parseError) {
        console.error("Failed to parse Gemini's JSON response:", responseText);
        console.error("Parse error:", parseError);
        
        // Try to extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[0]);
          } catch (fallbackError) {
            console.error("Fallback JSON extraction also failed");
          }
        }
        
        throw new Error("Gemini returned an invalid JSON format. Please try again with a clearer prompt.");
      }
    }

    return responseText;
    
  } catch (error) {
    console.error('Gemini API call failed:', error);
    
    if (error.message.includes('API request failed')) {
      throw error;
    }
    
    throw new Error(`Failed to communicate with Gemini API: ${error.message}`);
  }
}

// Default export for component compatibility
export default function GeminiAPI() {
  return null;
}