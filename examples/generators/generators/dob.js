module.exports = {
  name: "dob",
  description: "Generates a random date of birth (DD/MM/YYYY, age 18-67)",
  generate() {
    const currentYear = new Date().getFullYear();
    const year = currentYear - Math.floor(Math.random() * 50) - 18;
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");
    return `${day}/${month}/${year}`;
  },
};
