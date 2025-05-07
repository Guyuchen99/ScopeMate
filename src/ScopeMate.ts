import { initBrowser } from "./browser/Initialization.js";
import { loginIfNeeded } from "./browser/Login.js";
import { goToTargetPostings, goToTargetPostingsWithSavedSearches } from "./browser/Navigation.js";
import { processPostings } from "./browser/ProcessPostings.js";
import { Config } from "./config/Config.js";

async function startScopeMate() {
	const { page, browser } = await initBrowser();
	await loginIfNeeded(page);

	// await goToTargetPostings(page, Config.scope.targetJobPostingTerm);
	// await processPostings(page);

	await goToTargetPostingsWithSavedSearches(page, Config.scope.targetSavedSearches);
	await processPostings(page);

	console.log("Processed 3 New Job Postings!!!");
	// await browser.close();
}

startScopeMate();
