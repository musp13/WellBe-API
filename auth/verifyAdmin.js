const jwt = require('jsonwebtoken');
const { CreateError } = require('../utils/error.js');

const verifyAdminToken = (req,res,next)=>{
    
    const token = req.cookies.admin_access_token;
    //console.log('inside verify admin req.token = ', token);
    //const token = req.session.access_token;
    if(!token)
    {
        console.log('token not found');
        return next(CreateError(401, "You are not authenticated"));
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, user)=>{
        if(err){
            console.log('Token is not valid');
            return next(CreateError(401, "Token is not valid"));
        }
        req.admin = user;
        next();
    });
}

module.exports.verifyAdmin = (req, res, next)=>{
    verifyAdminToken(req, res, ()=>{
        //console.log('token verified. lets chck req.admin', req.admin,' and req.params= ', req.query, 'check if condotion true: ', req.admin.id === req.query.id);
        if (!req.admin || !req.admin.id) {
            console.log('401 error');
            return next(CreateError(401, "You are not authorized"));
        }
        if (!req.query || !req.query.id) {
            console.log('401 error');
            return next(CreateError(401, "You are not authorized"));
        }
        if(req.admin.id === req.query.id )
            next();
        else
            return next(CreateError(401, "You are not authorized"));
    })
}