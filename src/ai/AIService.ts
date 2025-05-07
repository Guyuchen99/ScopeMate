import OpenAI from "openai";
import { Config } from "../config/Config.js";

const openai = new OpenAI({
	baseURL: "https://openrouter.ai/api/v1",
	apiKey: Config.openRouter.apiKey,
});

export async function checkJobFitAndRole(title: string, description: string) {
	const response = await openai.chat.completions.create({
		model: Config.openRouter.basicModel,
		messages: [
			{
				role: "system",
				content: `
          You are an AI assistant that analyzes a job title and job description. 

          Your task is to determine:
            1) Is it a “developer role”?
            2) If yes, does it align with the user's developer interests listed below?

          The user's primary developer interests are:
            - Frontend
            - Backend
            - Web Development
            - Full Stack Development
            - Mobile App Development
            - Game Development
            - QA Automation / Testing

          Your final answer must be valid JSON **only** in this exact format:
            {
              "isDev": boolean,
              "isFit": boolean,
              "reason": string
            }
          
          Where:
            - "isDev" is true if the job is a software, web, or app developer role of any kind, else false.
            - "isFit" is true if it specifically matches one (or more) of the user’s interests listed above, else false.
            - "reason" is a short sentence explaining your reasoning.

          Do NOT include triple backticks, code fences, or any text outside the JSON object.
        `,
			},
			{
				role: "user",
				content: `
          Title: ${title},

          Description: ${description},

          Return valid JSON only, in the specified format. No extra text or markdown.
        `,
			},
		],
	});

	let content = response?.choices?.[0]?.message?.content?.trim();
	if (!content) {
		console.error("Full Response:", response);
		throw new Error(`No Valid Response from AI: ${response}`);
	}

	// Remove any triple backticks or code fences if they exist
	// This regex removes ```json, ``` and any language hinting
	content = content
		.replace(/```[\w]*\n?/g, "")
		.replace(/```/g, "")
		.trim();

	try {
		const parsed = JSON.parse(content);
		return {
			isDev: Boolean(parsed.isDev),
			isFit: Boolean(parsed.isFit),
			reason: parsed.reason || "",
		};
	} catch (err) {
		console.error("Full Text:", content);
		throw new Error(`Failed to Parse AI Response: ${err}`);
	}
}

export async function generateCoverLetter(companyName: string, jobDescription: string) {
	if (!jobDescription) {
		throw new Error("No Job Description Provided");
	}

	const today = new Date();
	const formattedDate = today.toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	});

	const response = await openai.chat.completions.create({
		model: Config.openRouter.basicModel,
		messages: [
			{
				role: "system",
				content: `
          You are an expert AI assistant that revises cover letters according to a given template and new job details. 
          You only output the updated cover letter text with no extraneous comments, disclaimers, or markdown.

          Instructions:
            1. Use the user's original cover letter structure and line breaks and wording as much as possible.
            2. Replace date with today's date ${formattedDate}.
            3. Replace references to the old company name with ${companyName}.
            4. Update the "Re:" line, the first paragraph, and the final paragraph to reflect the new company details and role.
            5. Preserve line breaks at the end. Ensure "Best regards," is followed by a new line. 
            6. Use simpler language where it improves clarity.
            7. Keep the tone confident but not overly formal.
            8. Absolutely do not include anything outside of the cover letter text (no code fences, no triple backticks, no disclaimers).
        `,
			},
			{
				role: "user",
				content: `
          Today's Date: ${formattedDate}
          Company Name: ${companyName}
          Original Cover Letter: ${Config.templates.coverLetter}
          Job Description:${jobDescription}

          Rewrite the cover letter to match these new details. Output only the revised cover letter text.
        `,
			},
		],
	});

	return response.choices?.[0]?.message?.content?.trim() || "";
}
