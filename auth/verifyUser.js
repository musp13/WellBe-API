const jwt = require('jsonwebtoken');
const { CreateError } = require('../utils/error.js');

const verifyUserToken = (req,res,next)=>{
    
    const token = req.cookies.user_access_token;
    //const token = req.session.access_token;
    if(!token)
        return next(CreateError(404, "You are not authenticated"));
    jwt.verify(token, process.env.JWT_SECRET, (err, user)=>{
        if(err)
            return next(CreateError(403, "Token is not valid"));
        req.user = user;
        next();
    });
}

module.exports.verifyUser = (req, res, next)=>{
    verifyUserToken(req, res, ()=>{
        if(req.user.id === req.query.id )
            next();
        else
            return next(CreateError(403, "You are not authorized"));
    })
}