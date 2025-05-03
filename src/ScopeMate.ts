import { initBrowser } from "./browser/Initialization.js";
import { loginIfNeeded } from "./browser/Login.js";
import { goToTargetPostings } from "./browser/Navigation.js";
import { processPostings } from "./browser/ProcessPostings.js";
import { Config } from "./config/Config.js";

async function startScopeMate() {
	const { page, browser } = await initBrowser();
	await loginIfNeeded(page);
	await goToTargetPostings(page, Config.targetJobPostingTerm);
	await processPostings(page);

	console.log("All Jobs Scanned!!!");
	await browser.close();
}

startScopeMate();
