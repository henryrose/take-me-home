require("dotenv").config();

const app = require("./app");
const { PORT } = require("./config");

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`take-me-home API listening on :${PORT}`);
});
