import fs from "fs";
import path from "path";
import { Page } from "puppeteer";
import { checkJobFitAndRole, generateCoverLetter } from "../ai/AIService.js";
import { saveAsPDF, saveAsJSONFile } from "../utils/Utilities.js";
import type { JobDetails, JobAnalysisMap } from "../types/Types.js";

const jobAnalysisPath = path.resolve("data/job_analysis.json");
let jobAnalysisMap: JobAnalysisMap = {};

if (fs.existsSync(jobAnalysisPath)) {
	jobAnalysisMap = JSON.parse(fs.readFileSync(jobAnalysisPath, "utf8"));
}

export async function processPostings(page: Page) {
	console.log("Scanning Job Postings...");

	const jobRows = await page.$$('tr[id^="posting"]');
	console.log(`Found ${jobRows.length} Jobs`);

	let processed = 0;
	for (const row of jobRows) {
		processed++; 

		const jobId = (await row.evaluate((el) => el.id)).replace("posting", "").trim();

		if (jobAnalysisMap[jobId]) {
			console.log(`Job Already Analyzed. Skipping...`);
			continue;
		}

		const jobTitle = await row.$eval("td.orgDivTitleMaxWidth", (el) => el.innerText.trim());
		const companyName = await row.$$eval("td.orgDivTitleMaxWidth", (cells) => cells[1]!.innerText.trim());
		const applyButton = await row.$("a.btn.btn-primary");
		console.log(`\nFound Job: ${jobTitle}`);

		// Read the button text to see if it's "Applied"
		const applyButtonText = await applyButton!.evaluate((el) => el.innerText.trim());
		if (applyButtonText === "Applied") {
			console.log(`Job Already Applied. Skipping...`);
			continue;
		}

		// Open job details in a new tab
		console.log(`Opening Job...`);
		const [newPage] = await Promise.all([
			new Promise<Page>((resolve) => {
				page.browser().once("targetcreated", async (target) => {
					const newPage = (await target.page())!;
					await newPage.bringToFront();
					resolve(newPage);
				});
			}),
			applyButton!.click(),
		]);

		// Wait for job description
		await newPage.waitForSelector("span.np-view-question--28", { timeout: 10000 });
		const fullJobDescription = await newPage.$eval("span.np-view-question--28", (el) => el.innerText.trim());

		console.log(`Processing Job #${processed}: ${jobTitle}`);
		const jobDetails: JobDetails = { jobId, jobTitle, companyName, fullJobDescription };
		await processSinglePosting(newPage, page, jobDetails);
	}
}

async function processSinglePosting(newPage: Page, mainPage: Page, jobDetails: JobDetails) {
	const { jobId, jobTitle, companyName, fullJobDescription } = jobDetails;

	let isDev: boolean | undefined;
	let isFit: boolean | undefined;
	let reason: string;

	// Ask the AI if it's a dev role and a good fit
	try {
		const result = await checkJobFitAndRole(jobTitle, fullJobDescription);
		isDev = result.isDev;
		isFit = result.isFit;
		reason = result.reason;

		const jobAnalysisMap: JobAnalysisMap = {
			[jobId]: { jobTitle, companyName, isDev, isFit, reason },
		};
		saveAsJSONFile("data/job_analysis.json", jobAnalysisMap);
	} catch (err) {
		console.error(`Error Checking for Job Fit and Role: ${err}`);
	}

	// If it's a dev role and a good fit, generate a cover letter
	if (isDev && isFit) {
		const safeFilename = jobTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase();
		await saveAsPDF(safeFilename, fullJobDescription, "data/job_descriptions");

		try {
			const coverLetter = await generateCoverLetter(companyName, fullJobDescription);
			await saveAsPDF(safeFilename, coverLetter, "data/cover_letters");
			console.log(`Cover Letter Generated for: ${jobTitle}`);
		} catch (err) {
			console.error(`Error Generating Cover Letter: ${err}`);
		}
	} else {
		console.log(`Skipping Cover Letter for: ${jobTitle} (Not dev or not a fit)`);
	}

	// // Close detail tab, bring main page to front
	await newPage.close();
	await mainPage.bringToFront();
}
