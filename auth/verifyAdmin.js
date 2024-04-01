const jwt = require('jsonwebtoken');
const { CreateError } = require('../utils/error.js');

const verifyAdminToken = (req,res,next)=>{
    
    const token = req.cookies.admin_access_token;
    console.log('inside verify admin req.token = ', token);
    //const token = req.session.access_token;
    if(!token)
    {
        console.log('token not found');
        return next(CreateError(404, "You are not authenticated"));
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, user)=>{
        if(err){
            console.log('Token is not valid');
            return next(CreateError(403, "Token is not valid"));
        }
        req.admin = user;
        next();
    });
}

module.exports.verifyAdmin = (req, res, next)=>{
    verifyAdminToken(req, res, ()=>{
        console.log('token verified. lets chck req.admin', req.admin,' and req.params= ', req.query);
        if(req.admin.id === req.query.id )
            next();
        else
            return next(CreateError(403, "You are not authorized"));
    })
}