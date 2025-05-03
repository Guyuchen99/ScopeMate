import { Page } from "puppeteer";
import { Config } from "../config/Config.js";

export async function goToTargetPostings(page: Page, targetJobPostingTerm: string) {
	await page.goto(`${Config.scopeUrl}/myAccount/co-op/postings.htm`, {
		waitUntil: "networkidle2",
	});

	console.log(`Clicking the '${targetJobPostingTerm}' Link...`);

	await Promise.all([
		page.evaluate((text) => {
			const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a"));
			const target = links.find((link) => link.textContent!.includes(text));
			if (target) target.click();
		}, targetJobPostingTerm),
		page.waitForNavigation({ waitUntil: "networkidle2" }),
	]);
}
