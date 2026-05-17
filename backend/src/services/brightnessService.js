const sharp = require('sharp');

exports.analyzeBrightness = async (buffer) => {
  const stats = await sharp(buffer).stats();
  const mean = stats.channels[0].mean;
  let category = 'medium';
  if (mean < 60) category = 'low';
  else if (mean > 200) category = 'high';
  else category = 'good';
  return { value: mean, category };
};
