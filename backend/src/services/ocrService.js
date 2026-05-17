const tesseract = require('tesseract.js');

exports.extractText = async (buffer) => {
  const { data: { text, confidence } } = await tesseract.recognize(buffer, 'eng');
  return { text: text.trim(), confidence: confidence / 100 };
};
