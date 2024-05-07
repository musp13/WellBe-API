const jwt = require('jsonwebtoken');
const { CreateError } = require('../utils/error.js');

const verifyUserToken = (req,res,next)=>{
    
    const token = req.cookies.user_access_token;
    //const token = req.session.access_token;
    if(!token)
        return next(CreateError(401, "You are not authenticated"));
    jwt.verify(token, process.env.JWT_SECRET, (err, user)=>{
        if(err)
            return next(CreateError(401, "Token is not valid"));
        req.user = user;
        next();
    });
}

module.exports.verifyUser = (req, res, next)=>{
    verifyUserToken(req, res, ()=>{
        if (!req.user || !req.user.id) {
            console.log('401 error');
            return next(CreateError(401, "You are not authorized"));
        }
        if (!req.query || !req.query.id) {
            console.log('401 error');
            return next(CreateError(401, "You are not authorized"));
        }
        if(req.user.id === req.query.id )
            next();
        else
            return next(CreateError(401, "You are not authorized"));
    })
}