/**
 * Anthropic Claude API integration component and functions
 */

/**
 * Calls the Anthropic Claude API to generate a response.
 *
 * @param {object} params
 * @param {string} params.prompt - The prompt to send to the model.
 * @param {object} [params.response_json_schema] - The JSON schema for the expected response format.
 * @param {string} [params.model='claude-sonnet-4-5-20250514'] - The Claude model to use.
 * @param {number} [params.max_tokens=8192] - The maximum number of tokens to generate.
 * @returns {Promise<string|object>} - The generated content, parsed as JSON if a schema is provided.
 */
export async function InvokeClaude({
  prompt,
  response_json_schema,
  model = 'claude-sonnet-4-5-20250514', // Using Claude Sonnet 4.5
  max_tokens = 8192
}) {
  // Using the API key from your Anthropic console
  const apiKey = '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';

  const system_prompt = response_json_schema
    ? `You are Claude Sonnet 4.5, Anthropic's most advanced AI educational content creator. Please respond ONLY with a valid JSON object that strictly adheres to the following schema. Do not include any explanatory text, markdown formatting, or other content - just pure JSON that validates against the schema.

Schema: ${JSON.stringify(response_json_schema, null, 2)}

Use your advanced reasoning capabilities to create comprehensive, detailed, and pedagogically sound educational content. Ensure all required fields are present and all data types match exactly.`
    : "You are Claude Sonnet 4.5, Anthropic's most advanced AI assistant specialized in educational content creation and learning optimization. Use your superior reasoning abilities to provide clear, accurate, engaging, and pedagogically excellent responses that enhance the learning experience with deep insights and comprehensive coverage.";

  const messages = [{
    role: 'user',
    content: prompt
  }];

  const requestBody = {
    model,
    max_tokens,
    system: system_prompt,
    messages
  };

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Anthropic API Error (${response.status}):`, errorBody);
      throw new Error(`Anthropic API request failed: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      console.error('Unexpected API response structure:', data);
      throw new Error('Invalid response format from Anthropic API');
    }

    const responseText = data.content[0].text.trim();

    if (response_json_schema) {
      try {
        const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
        const parsedResult = JSON.parse(cleanJson);
        return parsedResult;
      } catch (parseError) {
        console.error("Failed to parse Claude's JSON response:", responseText);
        console.error("Parse error:", parseError);
        
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[0]);
          } catch (fallbackError) {
            console.error("Fallback JSON extraction also failed");
          }
        }
        
        throw new Error("Claude returned an invalid JSON format. Please try again with a clearer prompt.");
      }
    }

    return responseText;
    
  } catch (error) {
    console.error('Claude API call failed:', error);
    
    if (error.message.includes('API request failed')) {
      throw error;
    }
    
    throw new Error(`Failed to communicate with Claude API: ${error.message}`);
  }
}

// Default export for component compatibility
export default function AnthropicAPI() {
  return null;
}