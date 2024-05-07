const jwt = require('jsonwebtoken');
const { CreateError } = require('../utils/error.js');

const verifyTherapistToken = (req,res,next)=>{
    const token = req.cookies.therapist_access_token;
    //const token = req.session.access_token;
    if(!token)
    {
        console.log('401 error');
        return next(CreateError(401, "You are not authenticated"));
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, user)=>{
        if(err){
            console.log('401 error');
            return next(CreateError(401, "Token is not valid"));
        }
        req.therapist = user;
        //console.log('hello, req.therapist', req.therapist);
        next();
    });
}

module.exports.verifyTherapist = (req, res, next)=>{
    verifyTherapistToken(req, res, ()=>{    
        if (!req.therapist || !req.therapist.id) {
            console.log('401 error');
            return next(CreateError(401, "You are not authorized"));
        }
        if (!req.query || !req.query.id) {
            console.log('401 error');
            return next(CreateError(401, "You are not authorized"));
        }
        if(req.therapist.id === req.query.id ){
            next();
        }
        else{
            console.log('401 error');
            return next(CreateError(401, "You are not authorized"));
        }
    })
}