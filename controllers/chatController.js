exports.handleMessage = (socket)=>{
    socket.on('message', (data)=>{
        console.log(data);
        socket.broadcast.emit('received', {data: data, message: 'This is a test message from server'})
    });
}

exports.handleDisconnection = (socket)=>{
    socket.on('disconnect', ()=>{
        console.log('A user disconnected');
        
    });
}