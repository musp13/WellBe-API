const CryptoJS = require('crypto-js');
const dotenv = require('dotenv');

dotenv.config();

module.exports.encrypt = (data)=>{
    const encryptedText = CryptoJS.AES.encrypt(data, process.env.ENCRYPTION_KEY).toString();
    return encryptedText;
}

module.exports.decrypt = (encryptedData)=>{
    const data = CryptoJS.AES.decrypt(encryptedData, process.env.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
    return data;
}