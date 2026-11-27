const express = require("express");
const { getCategories } = require("../categories");

const router = express.Router();

router.get("/", (req, res) => {
  res.json(getCategories());
});

module.exports = router;
