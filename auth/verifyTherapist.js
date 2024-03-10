const jwt = require('jsonwebtoken');
const { CreateError } = require('../utils/error.js');

const verifyTherapistToken = (req,res,next)=>{
    
    const token = req.cookies.therapist_access_token;
    //const token = req.session.access_token;
    if(!token)
        return next(CreateError(404, "You are not authenticated"));
    jwt.verify(token, process.env.JWT_SECRET, (err, user)=>{
        if(err)
            return next(CreateError(403, "Token is not valid"));
        req.therapist = user;
        next();
    });
}

module.exports.verifyTherapist = (req, res, next)=>{
    verifyTherapistToken(req, res, ()=>{
        if(req.therpist.id === req.params.id )
            next();
        else
            return next(CreateError(403, "You are not authorized"));
    })
}