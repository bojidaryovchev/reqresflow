module.exports = {
  name: "randomString",
  description: "Generates a random alphabetic string (default 10 chars)",
  generate() {
    const length = 10;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    return Array.from({ length }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length)),
    ).join("");
  },
};
