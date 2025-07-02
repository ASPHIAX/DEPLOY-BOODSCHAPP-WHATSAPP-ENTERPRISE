// QR Code storage for API access
let currentQR = null;

const setQR = (qr) => {
  currentQR = qr;
};

const getQR = () => currentQR;

module.exports = { setQR, getQR };