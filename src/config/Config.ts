import dotenv from "dotenv";
dotenv.config();

function getEnvVar(key: string, required: boolean = true) {
	const value = process.env[key];

	if (!value && required) {
		throw new Error(`Missing Required Environment Variable: ${key}`);
	}
	return value || "";
}

const openRouterApiKey: string = getEnvVar("OPEN_ROUTER_API_KEY");
const openRouterBasicModel: string = "qwen/qwen-2.5-72b-instruct:free";
const openRouterVisionModel: string = "qwen/qwen-2.5-72b-instruct:free";

const cwlUsername: string = getEnvVar("CWL_USERNAME");
const cwlPassword: string = getEnvVar("CWL_PASSWORD");

const scopeUrl: string = "https://scope.sciencecoop.ubc.ca";
const targetJobPostingTerm: string = "F25 - Apply Through SCOPE jobs";
const targetSavedSearches: string[] = ["BC-Jobs", "Frontend", "Full-Stack-Development", "Web-Development"];

const coverLetterTemplate = `
  March 11, 2025

  Re: Software Development Co-op - May 2025 - Demonware (Vancouver) 

  Dear Hiring Manager,

  As a passionate Software Developer with a dream to work for and learn from a company that powers some of the world’s biggest gaming companies, I am thrilled to see this Software Development Co-op opportunity at Demonware. I am inspired by how Demonware delivers scalable and cutting-edge online services, enabling seamless multiplayer experiences for millions of players. With a strong foundation in object-oriented design principles, data structures, and skills in Python, C++, and JavaScript, I am confident that I would be a great fit at Demonware.

  Among my relevant technical projects, I have developed my personal portfolio website, https://ycgraphixs.com/, where I showcase my frontend design skills and creative approach to web development. In another project, I developed a full-stack UNO card game system, using MySQL, Node.js, and Express.js to manage players, memberships, game events, and match data across multiple pages. This project followed the MVC architecture with a RESTful API, enabling efficient backend logic while integrating cookies and local storage for seamless authentication and session management. Additionally, I designed a responsive UI using EJS templates, incorporating comprehensive form validation, asynchronous data fetching, and real-time user interactions to enhance the user experience. On the backend, I structured SQL DDL and DML templates to process complex user queries while implementing sanitization techniques to mitigate security risks like SQL injections. Through this experience, I strengthened my ability to design scalable software, troubleshoot technical issues, and write maintainable code.

  Beyond my technical background, my experience as a Badminton Coach at Master Badminton has strengthened my communication, critical thinking, and leadership skills. I collaborated with two other coaches to train players in game techniques and tactics, analyzed over 100 hours of match footage, and provided personalized feedback to enhance their performance. These experiences have enhanced my ability to work in a team oriented, fast-paced environment, a skill that I believe is essential for any developer. 

  I would love the opportunity to bring my technical expertise and teamwork skills to Demonware. Please contact me directly at guyuchen999@gmail.com or through UBC at interviews@sciencecoop.ubc.ca to arrange an interview. I am fully committed to delivering high-quality work and contributing to your team’s success!!!

  Best regards,

  Yuchen Gu	
`;

export const Config = {
	openRouter: {
		apiKey: openRouterApiKey,
		basicModel: openRouterBasicModel,
		visionModel: openRouterVisionModel,
	},
	credentials: {
		cwlUsername: cwlUsername,
		cwlPassword: cwlPassword,
	},
	scope: {
		url: scopeUrl,
		targetJobPostingTerm: targetJobPostingTerm,
		targetSavedSearches: targetSavedSearches,
	},
	templates: {
		coverLetter: coverLetterTemplate,
	},
};
