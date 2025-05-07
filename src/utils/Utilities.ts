import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument, StandardFonts, rgb, PDFName, PDFPage } from "pdf-lib";
import type { JobAnalysisMap } from "../types/Types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function saveAsJSONFile(filePath: string, data: JobAnalysisMap) {
	const fullPath = path.resolve(filePath);
	fs.mkdirSync(path.dirname(fullPath), { recursive: true });

	let existingData: JobAnalysisMap = {};

	if (fs.existsSync(fullPath)) {
		const fileContents = fs.readFileSync(fullPath, "utf8");

		try {
			existingData = JSON.parse(fileContents);
		} catch (err) {
			console.warn(`Error Parsing Existing JSON File: ${err}`);
		}
	}

	for (const [jobId, entry] of Object.entries(data)) {
		existingData[jobId] = entry;
	}

	fs.writeFileSync(fullPath, JSON.stringify(existingData, null, 2), "utf8");
}

export async function saveAsPDF(filename: string, content: string, folder: string) {
	content = content.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");

	// Ensure folder exists
	fs.mkdirSync(folder, { recursive: true });

	// Create the PDF document
	const pdfDoc = await PDFDocument.create();
	const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

	// Read and embed the footer image (update the path to your actual footer image file)
	const footerImagePath = path.resolve(__dirname, "../../assets/CoopFooter.jpg");
	const footerImageBytes = fs.readFileSync(footerImagePath);
	const footerImage = await pdfDoc.embedJpg(footerImageBytes);

	// Get the original image dimensions
	const originalFooterWidth = footerImage.width;
	const originalFooterHeight = footerImage.height;

	// Set the desired footer size (here reduced to 25% of original)
	const footerWidth = originalFooterWidth * 0.25;
	const footerHeight = originalFooterHeight * 0.25;

	// Create the first page
	let page = pdfDoc.addPage();
	let { width: pageWidth, height: pageHeight } = page.getSize();

	const margin = 50;
	const fontSize = 12;
	const lineHeight = fontSize + 4;
	const maxLineWidth = pageWidth - margin * 2;

	// Set the starting position (near the top of the page)
	let y = pageHeight - margin;

	// Helper function that wraps a long line into an array of lines that fit the maximum width.
	function wrapLine(lineText: string) {
		const words = lineText.split(/\s+/);
		const wrappedLines: string[] = [];
		let currentLine = "";
		for (let i = 0; i < words.length; i++) {
			const testLine = currentLine ? currentLine + " " + words[i] : words[i];
			const testLineWidth = font.widthOfTextAtSize(testLine!, fontSize);
			if (testLineWidth > maxLineWidth && i > 0) {
				wrappedLines.push(currentLine);
				currentLine = words[i]!;
			} else {
				currentLine = testLine!;
			}
		}
		if (currentLine) {
			wrappedLines.push(currentLine);
		}
		return wrappedLines;
	}

	// Helper to draw the footer image at the bottom of the page.
	function drawFooterImage() {
		const x = margin;
		const yBottom = margin; // a little padding from the bottom edge
		page.drawImage(footerImage, {
			x,
			y: yBottom,
			width: footerWidth,
			height: footerHeight,
		});
	}

	// Adds a link annotation for a given rectangle so that clicking it opens a mailto link.
	function addLinkAnnotation(page: PDFPage, x: number, y: number, width: number, height: number, url: string) {
		// Build the annotation dictionary (using pdf-lib low-level API)
		const annotation = pdfDoc.context.obj({
			Type: "Annot",
			Subtype: "Link",
			Rect: [x, y, x + width, y + height],
			Border: [0, 0, 0],
			A: {
				Type: "Action",
				S: "URI",
				URI: url,
			},
		});

		// Get existing annotations, if any, and add the new one.
		const annotsKey = PDFName.of("Annots");
		let annots: any = page.node.get(annotsKey);
		if (annots) {
			// Convert to an array (if not already)
			const annotsArray = annots.asArray();
			annotsArray.push(annotation);
			page.node.set(annotsKey, pdfDoc.context.obj(annotsArray));
		} else {
			page.node.set(annotsKey, pdfDoc.context.obj([annotation]));
		}
	}

	// Draws a line of text while searching for email addresses.
	// Any email found will be drawn in blue, underlined, and clickable.
	function drawTextWithEmailsAndUrls(page: PDFPage, line: string, startX: number, y: number) {
		let currentX = startX;
		// Regular expression to match an email address.
		const regex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(https?:\/\/[^\s]+)/g;
		let lastIndex = 0;
		let match;

		while ((match = regex.exec(line)) !== null) {
			const emailText = match[0];
			const matchIndex = match.index;

			// Draw text before the email (if any) in default black.
			const precedingText = line.substring(lastIndex, matchIndex);
			if (precedingText) {
				page.drawText(precedingText, { x: currentX, y, size: fontSize, font });
				currentX += font.widthOfTextAtSize(precedingText, fontSize);
			}

			// Draw the email itself in blue.
			page.drawText(emailText, { x: currentX, y, size: fontSize, font, color: rgb(0, 0, 1) });
			const emailWidth = font.widthOfTextAtSize(emailText, fontSize);

			// Draw an underline for the email.
			page.drawLine({
				start: { x: currentX, y: y - 2 },
				end: { x: currentX + emailWidth, y: y - 2 },
				thickness: 1,
				color: rgb(0, 0, 1),
			});

			// Add the mailto link annotation.
			addLinkAnnotation(page, currentX, y, emailWidth, fontSize, `mailto:${emailText}`);

			currentX += emailWidth;
			lastIndex = regex.lastIndex;
		}

		// Draw any remaining text after the last email.
		const remainingText = line.substring(lastIndex);
		if (remainingText) {
			page.drawText(remainingText, { x: currentX, y, size: fontSize, font });
		}
	}

	// Process the input text line by line and wrap it.
	const contentLines = content.split(/\r?\n/);
	for (const rawLine of contentLines) {
		const wrappedLines = wrapLine(rawLine);

		for (const line of wrappedLines) {
			// If there's not enough space for a new line (taking footer into account), add a new page.
			if (y - lineHeight < margin + footerHeight) {
				// Draw the footer image for the current page.
				drawFooterImage();
				// Add a new page and reset the y-coordinate.
				page = pdfDoc.addPage();
				({ width: pageWidth, height: pageHeight } = page.getSize());
				y = pageHeight - margin;
			}

			// Instead of drawing the whole text at once, we now handle emails specially.
			drawTextWithEmailsAndUrls(page, line, margin, y);

			// Move down to the next line.
			y -= lineHeight;
		}

		// Add extra spacing if the original line was blank.
		if (wrappedLines.length === 0) {
			y -= lineHeight;
		}
	}

	// Draw the footer image on the last page.
	drawFooterImage();

	// Finally, save the PDF to disk.
	const pdfBytes = await pdfDoc.save();
	fs.writeFileSync(path.join(folder, `${filename}.pdf`), pdfBytes);
}
