const jwt = require('jsonwebtoken');
const { CreateError } = require('../utils/error.js');

const verifyAdminToken = (req,res,next)=>{
    
    const token = req.cookies.admin_access_token;
    //const token = req.session.access_token;
    if(!token)
        return next(CreateError(404, "You are not authenticated"));
    jwt.verify(token, process.env.JWT_SECRET, (err, user)=>{
        if(err)
            return next(CreateError(403, "Token is not valid"));
        req.admin = user;
        next();
    });
}

module.exports.verifyAdmin = (req, res, next)=>{
    verifyAdminToken(req, res, ()=>{
        if(req.admin.id === req.params.id )
            next();
        else
            return next(CreateError(403, "You are not authorized"));
    })
}