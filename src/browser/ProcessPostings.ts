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

		// Wait for job description and application procedure
		await newPage.waitForSelector("span.np-view-question--28", { timeout: 10000 });
		const fullJobDescription = await newPage.$eval("span.np-view-question--28", (el) => el.innerText.trim());
		await newPage.waitForSelector("span.np-view-question--35", { timeout: 10000 });
		const applicationProcedure = await newPage.$eval("span.np-view-question--35", (el) => el.innerText.trim());

		processed++;
		console.log(`Processing Job #${processed}: ${jobTitle}`);
		const jobDetails: JobDetails = { jobId, jobTitle, companyName, applicationProcedure, fullJobDescription };
		await processSinglePosting(newPage, page, jobDetails);

		if (processed > 5) {
			break;
		}
	}
}

async function processSinglePosting(newPage: Page, mainPage: Page, jobDetails: JobDetails) {
	const { jobId, jobTitle, companyName, applicationProcedure, fullJobDescription } = jobDetails;

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
			[jobId]: { jobTitle, companyName, applicationProcedure, isDev, isFit, reason },
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

			if (applicationProcedure === "Through UBC Science Co-op") {
				const coverLetterPath = path.resolve("data", "cover_letters", `${safeFilename}.pdf`);
				const jobPackage = {
					jobId,
					coverLetterPath,
				};
				await sendScopeApplication(newPage, jobPackage);
			}
		} catch (err) {
			console.error(`Error Generating Cover Letter: ${err}`);
		}
	} else {
		console.log(`Skipping Cover Letter for: ${jobTitle} (Not dev or not a fit)`);
	}

	// Close detail tab, bring main page to front
	await newPage.close();
	await mainPage.bringToFront();
}

async function sendScopeApplication(page: Page, jobPackage: any) {
	const { jobId, coverLetterPath } = jobPackage;

	await Promise.all([page.click("button.applyButton"), page.waitForNavigation({ waitUntil: "networkidle2" })]);

	await page.waitForSelector('input[name="applyOption"][value="customPkg"]', { visible: true });
	await page.click('input[name="applyOption"][value="customPkg"]');

	await Promise.all([
		page.evaluate(() => {
			const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a"));
			const target = links.find((link) => link.textContent?.includes("Click if you need to upload a new document"));
			if (target) target.click();
		}),
		page.waitForNavigation({ waitUntil: "networkidle2" }),
	]);

	await page.waitForSelector("#docName", { visible: true });
	await page.type("#docName", `${jobId}_CoverLetter`);

	await page.waitForSelector("#docType", { visible: true });
	await page.select("#docType", "1");

	const inputUploadHandle = await page.$('input[type="file"]#fileUpload_docUpload');
	if (inputUploadHandle) {
		await inputUploadHandle.uploadFile(coverLetterPath);
	}

	await new Promise((resolve) => setTimeout(resolve, 3000));

	await page.waitForSelector("#submitFileUploadFormBtn", { visible: true });
	await page.click("#submitFileUploadFormBtn");

	await page.waitForSelector('input[name="applyOption"][value="customPkg"]', { visible: true });
	await page.click('input[name="applyOption"][value="customPkg"]');

	await page.waitForSelector("input#packageName", { visible: true });
	await page.type("input#packageName", `${jobId}_Package`);

	await page.evaluate(() => {
		const select = document.querySelector<HTMLSelectElement>("#requiredInPackage11");
		if (select) {
			const option = Array.from(select.options).find((opt) => opt.textContent?.includes("Summary_Sheet_2025"));
			if (option) {
				select.value = option.value;
				select.dispatchEvent(new Event("change", { bubbles: true }));
			}
		}
	});

	await page.evaluate((jobId) => {
		const select = document.querySelector<HTMLSelectElement>("#requiredInPackage1");
		if (select) {
			const option = Array.from(select.options).find((opt) => opt.textContent?.includes(`${jobId}_CoverLetter`));
			if (option) {
				select.value = option.value;
				select.dispatchEvent(new Event("change", { bubbles: true }));
			}
		}
	}, jobId);

	await page.evaluate(() => {
		const select = document.querySelector<HTMLSelectElement>("#requiredInPackage2");
		if (select) {
			const option = Array.from(select.options).find((opt) => opt.textContent?.includes("Resume_2025"));
			if (option) {
				select.value = option.value;
				select.dispatchEvent(new Event("change", { bubbles: true }));
			}
		}
	});

	await page.evaluate(() => {
		const select = document.querySelector<HTMLSelectElement>("#requiredInPackage8");

		if (select) {
			const option = Array.from(select.options).find((opt) => opt.textContent?.includes("Student Transcript"));
			if (option) {
				select.value = option.value;
				select.dispatchEvent(new Event("change", { bubbles: true }));
			}
		}
	});

	await new Promise((resolve) => setTimeout(resolve, 3000));
	await page.waitForSelector('input[type="submit"][value="Submit Application"]', { visible: true });
	await page.click('input[type="submit"][value="Submit Application"]');
	console.log("Application Submitted!");
}
