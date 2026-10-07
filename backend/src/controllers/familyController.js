const familyService = require("../services/familyService");
const { createFamilySchema } = require("../validators/familyValidators");
const { sendSuccess } = require("../utils/apiResponse");

async function createFamily(req, res) {
  const { name } = createFamilySchema.parse(req.body);
  const family = await familyService.createFamily(req.user.id, name);
  return sendSuccess(res, { status: 201, data: { family } });
}

async function getMyFamily(req, res) {
  const family = await familyService.getMyFamily(req.user.id, req.familyMembership);
  return sendSuccess(res, { data: { family } });
}

async function getMembers(req, res) {
  const members = await familyService.getMembers(req.familyMembership.familyId);
  return sendSuccess(res, { data: { members } });
}

async function removeMember(req, res) {
  const member = await familyService.removeMember(
    req.familyMembership.familyId,
    req.params.memberId,
    req.user.id
  );
  return sendSuccess(res, { data: { member } });
}

module.exports = { createFamily, getMyFamily, getMembers, removeMember };
