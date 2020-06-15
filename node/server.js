const ws = require('nodejs-websocket')
const moment = require('moment')

var users = [/*{ key, name }*/];//用户列表

let server = ws.createServer((connection)=>{
    //connection链接对象
    connection.on('text',(msg)=>{
        let data = JSON.parse(msg);
        if(data.event == 'groupChat'){
            //群聊接口
            let { msg, imgHead,name } = data.data
            //对当前发送消息的客户端发送消息
            connection.sendText(JSON.stringify({
                code: 200,
                event: 'groupChat',
                data: {
                    name,
                    msg,
                    time: moment().format('HH:mm:ss'),
                    imgHead,
                    type: 1,//1表示自己， 2表示其他人
                }
            }))
            //广播 - 对所有客户端(除自己)发送消息
            server.connections.forEach(conn =>{
                if(conn != connection){
                    conn.sendText(JSON.stringify({
                        code: 200,
                        event: 'groupChat',
                        data: {
                            name,
                            msg,
                            time: moment().format('HH:mm:ss'),
                            imgHead,
                            type: 2,//1表示自己， 2表示其他人
                        }
                    }))
                }
            })
        }
        else if(data.event == 'groupChat/status'){
            //广播 - 对所有客户端发送消息
            let { name,type,imgHead } = data.data;
            connection.sendText(JSON.stringify({
                code: 200,
                event: 'groupChat/status',
                data: {
                   key: connection.key,
                   id: 'my'
                }
            }))
            server.connections.forEach(conn =>{
                conn.sendText(JSON.stringify({
                    code: 200,
                    event: 'groupChat/status',
                    data: {
                        name,
                        type,//3表示进入， 4表示离开
                    }
                }))
            })

            if(type == 3){//进入时记录所有用户的列表
                users.push({
                    name,
                    key: connection.key,
                    imgHead: imgHead
                })
                server.connections.forEach(conn =>{
                    conn.sendText(JSON.stringify({
                        code: 200,
                        event: 'groupChat/users',
                        data: users
                    }))
                })
            }
        }
        else if(data.event == 'privateChat'){
            let { key,msg,imgHead,name } = data.data;
            connection.sendText(JSON.stringify({
                code: 200,
                event: 'privateChat',
                data: {
                    msg,
                    name,
                    time: moment().format('HH:mm:ss'),
                    type: 1,//1表示自己， 2表示其他人
                    imgHead,
                    key
                }
            }))
            server.connections.forEach(conn =>{
                if(conn.key == key){
                    console.log(1111);
                    conn.sendText(JSON.stringify({
                        code: 200,
                        event: 'privateChat',
                        data:{
                            msg,
                            name,
                            time: moment().format('HH:mm:ss'),
                            type: 2,
                            imgHead,
                            key: connection.key
                        }
                    }))
                }
            })
        }
    })
    connection.on('close',(code)=>{
        //某个客户端退出触发
        console.log('关闭链接',code)
        console.log(connection.key)//链接实例对象的唯一标识，即客户端的id
        let index = null;
        let key = connection.key;
        users.forEach((item,item_index) =>{
            if(item.key == connection.key){
                index = item_index
                return;
            }
        })
        if(index != null){
         let obj = users.splice(index,1)
         //console.log(obj)
         server.connections.forEach(conn =>{
            conn.sendText(JSON.stringify({
                code: 200,
                event: 'groupChat/close',
                data: {
                    name: obj[0].name,
                    index,
                    key,
                    type: 4//3表示进入， 4表示离开
                }
            }))
         })

            server.connections.forEach(conn =>{
                conn.sendText(JSON.stringify({
                    code: 200,
                    event: 'groupChat/users',
                    data: users
                }))
            })
        }
    })
    connection.on('error',(code)=>{
        console.log('异常链接',code)
    })
}).listen(8001)

server.on('connection',(conn)=>{
    console.log('开启链接')
})