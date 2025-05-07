import { Page } from "puppeteer";
import { Config } from "../config/Config.js";

export async function loginIfNeeded(page: Page) {
	// Try to access the dashboard directly
	await page.goto(`${Config.scope.url}/myAccount/dashboard.htm`, {
		waitUntil: "networkidle2",
	});

	if (page.url().includes("notLoggedIn")) {
		console.log("Not Logged In. Performing Login...");

		// Go to the SCOPE login portal
		await page.goto(`${Config.scope.url}/students/cwl-current-student-login.htm`);

		// Click the CWL Login button (anchor with Shibboleth SSO)
		await page.waitForSelector('a[href*="Shibboleth.sso"]');
		await Promise.all([page.click('a[href*="Shibboleth.sso"]'), page.waitForNavigation({ waitUntil: "networkidle2" })]);

		// Enter CWL username and password
		await page.waitForSelector("#username");
		await page.waitForSelector("#password");
		await page.type("#username", Config.credentials.cwlUsername, { delay: 100 });
		await page.type("#password", Config.credentials.cwlPassword, { delay: 100 });
		await Promise.all([page.click('button[name="_eventId_proceed"]'), page.waitForNavigation({ waitUntil: "domcontentloaded" })]);

		// Wait until URL shows we're logged into SCOPE
		console.log("Waiting for You to Approve 2FA on Your Phone...");
		await page.waitForFunction(() => window.location.href.includes("/myAccount/dashboard.htm"), { timeout: 0 });
		console.log("2FA Complete. Logged in!");
	} else {
		console.log("Logged In Successfully Using Session Cache.");
	}
}
