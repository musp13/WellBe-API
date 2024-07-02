const { Server } = require('socket.io');
const chatController = require('../controllers/chatController');
const Chat = require('../models/chatModel');
const User = require('../models/userModel');
/* const dotenv = require('dotenv');
dotenv.config(); */

const onlineUsers = new Map();

const initializeSocket = (server)=>{
    const io = new Server(server, {
        cors: {
            origin: process.env.BASE_URL_CLIENT,
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on('connection', (socket)=>{
        console.log('Socket.io user connected');

        socket.on('joinChat', ({ userId, userType}) => {
            if(userType === 'Admin'){
                socket.join('admin');
            }else{
                
                socket.join(userId);
                onlineUsers.set(userId, socket.id); //  store the user's socket id for reference of the user online
                console.log(`onlineUsers: ${Array.from(onlineUsers.keys())}`); 
            }
            //emit the pudated list of  online users to the admin
            io.to('admin').emit('onlineUsers', Array.from(onlineUsers.keys()));
        });

        socket.on('sendMessage', async ({userId, senderType, message })=>{
            const chatMessage = new Chat({
                userId,
                senderType,
                message
            });
            await chatMessage.save();

            if(senderType==='Admin'){
                console.log('admin sends message to user: ', userId);
                io.to(userId).emit('messageReceived', {
                    userId:chatMessage.userId, 
                    senderType: chatMessage.senderType, 
                    message: chatMessage.message, 
                    createdAt: chatMessage.createdAt 
                });
            }
            else{
                //io.to('admin').emit('messageReceived', chatMessage);
                io.to('admin').emit('messageReceived', {
                    userId:chatMessage.userId, 
                    senderType: chatMessage.senderType, 
                    message: chatMessage.message, 
                    createdAt: chatMessage.createdAt 
                });
            }
        });

        socket.on('joinVideoCall', ({userId, userType, roomId})=>{
            socket.join(roomId);
            console.log(`User ${userId} joined video call room ${roomId}`);
            socket.to(roomId).emit('userJoined', { userId, userType });
        });

        socket.on('sendVideoMessage', payload=>{
            console.log('hello inside sendVideoMessage: ', payload);
            const { roomId, ...data } = payload;
            console.log(`check data:`, data);
            
            console.log('inside sendVideoMessage Socket connection', roomId);
            socket.to(roomId).emit('videoMessage', data);
        })

        socket.on('disconnect', ()=>{
            console.log('user disconnected');
            onlineUsers.forEach((value,key)=>{
                if(value === socket.id){
                    onlineUsers.delete(key);
                }
            });
            // emit the updated list of online users to the admin
            io.to('admin').emit('onlineUsers', Array.from(onlineUsers.keys()));

            console.log('Socket.io user disconnected');
        });

        

        chatController.handleMessage(socket);
       /*  socket.on('message', (data)=>{
            console.log(data);
            socket.broadcast.emit('received', {data: data, message: 'This is a test message from server'})
        }) */
        //chatController.handleDisconnection(socket);
    })

    return io;
}

module.exports = initializeSocket;