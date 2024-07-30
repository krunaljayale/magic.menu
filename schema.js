const Joi = require("joi");

module.exports.listingSchema = Joi.object({
    name :Joi.string().required(),
    info:Joi.string().required(),
    price:Joi.number().required(),
    category:Joi.string().required(),
}).required()