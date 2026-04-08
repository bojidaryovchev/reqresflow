module.exports = {
  name: "cardExpiry",
  description: "Generates a random future card expiry (MM/YYYY)",
  generate() {
    const currentYear = new Date().getFullYear();
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
    const year = currentYear + Math.floor(Math.random() * 5) + 1;
    return `${month}/${year}`;
  },
};
