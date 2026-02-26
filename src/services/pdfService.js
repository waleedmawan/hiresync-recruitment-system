const fs = require('fs');
const PDF2Json = require('pdf2json');

class PdfService {

  static extractText(filePath) {
    return new Promise((resolve, reject) => {
      const parser = new PDF2Json();

      parser.on('pdfParser_dataError', (err) => {
        console.error('PDF extraction failed:', err.parserError);
        reject(new Error('Could not read PDF file'));
      });

      parser.on('pdfParser_dataReady', (pdfData) => {
        try {
          let fullText = '';

          pdfData.Pages.forEach(page => {
            page.Texts.forEach(textItem => {
              textItem.R.forEach(run => {
                fullText += decodeURIComponent(run.T) + ' ';
              });
            });
            fullText += '\n';
          });

          const cleaned = PdfService.cleanText(fullText);
          resolve(cleaned);

        } catch (err) {
          reject(new Error('Could not parse PDF content'));
        }
      });

      parser.loadPDF(filePath);
    });
  }

  static cleanText(rawText) {
    return rawText
      .replace(/\r\n/g, '\n')
      .replace(/[^\x20-\x7E\n]/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/ {2,}/g, ' ')
      .trim();
  }
}

module.exports = PdfService;