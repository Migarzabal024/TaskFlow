const invitationService = require("../services/invitationService");
const { createInvitationSchema } = require("../validators/invitationValidators");
const { sendSuccess } = require("../utils/apiResponse");

async function createInvitation(req, res) {
  const { email } = createInvitationSchema.parse(req.body);
  const invitation = await invitationService.createInvitation(
    req.familyMembership.familyId,
    req.user.id,
    email
  );
  return sendSuccess(res, { status: 201, data: { invitation } });
}

async function listInvitations(req, res) {
  const invitations = await invitationService.listInvitations(req.user, req.familyMembership);
  return sendSuccess(res, { data: { invitations } });
}

async function acceptInvitation(req, res) {
  const result = await invitationService.acceptInvitation(req.params.token, req.user);
  return sendSuccess(res, { data: result });
}

async function rejectInvitation(req, res) {
  const invitation = await invitationService.rejectInvitation(req.params.token, req.user);
  return sendSuccess(res, { data: { invitation } });
}

module.exports = { createInvitation, listInvitations, acceptInvitation, rejectInvitation };
