const Joi = require("joi");

module.exports.listingSchema = Joi.object({
    name :Joi.string().required(),
    info:Joi.string().required(),
    img :Joi.string().allow("",null),
    price:Joi.number().required(),
    }).required()