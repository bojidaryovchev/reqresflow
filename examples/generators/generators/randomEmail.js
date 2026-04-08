module.exports = {
  name: "randomEmail",
  description: "Generates a random email address",
  generate() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let user = "";
    for (let i = 0; i < 8; i++) {
      user += chars[Math.floor(Math.random() * chars.length)];
    }
    const domains = ["example.com", "test.org", "demo.net"];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${user}@${domain}`;
  },
};
