module.exports = {
  name: "timestamp",
  description: "Current Unix timestamp in seconds",
  generate() {
    return String(Math.floor(Date.now() / 1000));
  },
};
