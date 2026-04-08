module.exports = {
  name: "randomNumber",
  description: "Generates a random numeric string (default 10 digits)",
  generate() {
    const length = 10;
    const chars = "0123456789";
    return Array.from({ length }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length)),
    ).join("");
  },
};
