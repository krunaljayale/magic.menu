<<<<<<< HEAD
const Joi = require("joi");

module.exports.listingSchema = Joi.object({
    name :Joi.string().required(),
    info:Joi.string().required(),
    price:Joi.number().required(),
    category:Joi.string().required(),
=======
const Joi = require("joi");

module.exports.listingSchema = Joi.object({
    name :Joi.string().required(),
    info:Joi.string().required(),
    price:Joi.number().required(),
    category:Joi.string().required(),
>>>>>>> f1e8b9d79a1fb51f4505f634e796c685ea7d3472
}).required()