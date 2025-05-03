import puppeteer from "puppeteer";

export async function initBrowser() {
	const browser = await puppeteer.launch({
		headless: false, // launch a visible Chrome browser
		userDataDir: "session", // persistent session folder
	});

	const [page] = await browser.pages();
	if (!page) throw new Error("No Tabs Available.");
	await page.bringToFront();

	return { page, browser };
}
