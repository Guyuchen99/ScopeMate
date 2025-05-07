import { Page } from "puppeteer";
import { Config } from "../config/Config.js";

export async function goToTargetPostings(page: Page, targetJobPostingTerm: string) {
	await page.goto(`${Config.scope.url}/myAccount/co-op/postings.htm`, {
		waitUntil: "networkidle0",
	});

	console.log(`Clicking the '${targetJobPostingTerm}' Link...`);

	await Promise.all([
		page.evaluate((text) => {
			const links = Array.from(document.querySelectorAll("a"));
			const target = links.find((link) => link.textContent?.includes(text));
			if (target) target.click();
		}, targetJobPostingTerm),
		page.waitForNavigation({ waitUntil: "networkidle2" }),
	]);
}

export async function goToTargetPostingsWithSavedSearches(page: Page, selections: string[]) {
	await page.goto(`${Config.scope.url}/myAccount/co-op/postings.htm`, {
		waitUntil: "networkidle0",
	});

	console.log("Opening the 'Run Multiple Saved Searches' Modal...");

	// Click the link that opens the modal
	await page.evaluate(() => {
		const links = Array.from(document.querySelectorAll("a"));
		const target = links.find((link) => link.textContent?.trim() === "Run Multiple Saved Searches");
		if (target) target.click();
	});
	await page.waitForSelector("form#runMultipleSearchesForm", { visible: true });

	// Check the checkboxes corresponding to the selections
	await page.evaluate((selectedLabels) => {
		const form = document.querySelector("form#runMultipleSearchesForm");
		if (!form) return;

		const labels = form.querySelectorAll("label");
		labels.forEach((label) => {
			const labelText = label.textContent?.trim();
			if (labelText && selectedLabels.includes(labelText)) {
				const checkbox = label.querySelector<HTMLInputElement>("input[type='checkbox']");
				if (checkbox && !checkbox.checked) {
					checkbox.checked = true;
				}
			}
		});
	}, selections);
	console.log(`Selected Checkboxes: ${selections.join(", ")}`);

	// Submit the form and wait for navigation
	await Promise.all([
		page.$eval("form#runMultipleSearchesForm button[type='submit']", (btn: HTMLButtonElement) => btn.click()),
		page.waitForNavigation({ waitUntil: "networkidle2" }),
	]);
}
