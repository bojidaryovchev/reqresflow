module.exports = {
  name: "uuidv4",
  description: "Generates a random alphanumeric string (default 16 chars)",
  generate() {
    const length = 16;
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
    return Array.from({ length }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length)),
    ).join("");
  },
};
