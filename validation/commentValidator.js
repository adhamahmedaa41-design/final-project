// validation/commentValidator.js
const Joi = require("joi");

const createCommentSchema = Joi.object({
  postId: Joi.string().required().messages({
    "any.required": "Post ID is required",
    "string.base": "Post ID must be a string",
  }),
  text: Joi.string().trim().min(1).max(1000).required().messages({
    "any.required": "Comment text is required",
    "string.empty": "Comment cannot be empty",
    "string.max": "Comment cannot be longer than 1000 characters",
  }),
});

module.exports = {
  createCommentSchema,
};
