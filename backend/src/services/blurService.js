const sharp = require('sharp');

exports.detectBlur = async (buffer) => {
  const { data } = await sharp(buffer).greyscale().raw().toBuffer({ resolveWithObject: true });
  const mean = data.reduce((a, b) => a + b) / data.length;
  let variance = 0;
  for (let i = 0; i < data.length; i++) variance += Math.pow(data[i] - mean, 2);
  variance /= data.length;
  return Math.min(variance / 2500, 1.0);
};
