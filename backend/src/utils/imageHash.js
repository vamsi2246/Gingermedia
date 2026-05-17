const sharp = require('sharp');

exports.computePHash = async (buffer) => {
  const { data } = await sharp(buffer)
    .resize(8, 8, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const avg = data.reduce((a, b) => a + b) / data.length;
  let hash = '';
  for (let i = 0; i < data.length; i++) hash += data[i] >= avg ? '1' : '0';
  return BigInt('0b' + hash).toString(16).padStart(16, '0');
};
