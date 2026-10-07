const statisticsService = require("../services/statisticsService");
const { sendSuccess } = require("../utils/apiResponse");

async function getStatistics(req, res) {
  const statistics = await statisticsService.getStatistics(req.user, req.familyMembership);
  return sendSuccess(res, { data: { statistics } });
}

module.exports = { getStatistics };
