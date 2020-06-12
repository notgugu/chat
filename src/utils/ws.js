if(window.WebSocket){
  WebSocket.prototype.sendJson = function(json){
    this.send(JSON.stringify(json))
  }
}

export function ws(options){
  /*
  event:   @object //{ event:'事件', data: {} }
  success: @function
  error    @function
  close    @function
  open     @function
  */
 if(window.WebSocket){
    var ws = new WebSocket("ws://127.0.0.1:8001");

    ws.onopen = function()
    {
        // Web Socket 已连接上，使用 send() 方法发送数据
        if(options.open){
          options.open(ws)
        }
    };
        
    ws.onmessage = function (evt) 
    { 
        var received_msg = evt.data;
        if(options.success){
          options.success(JSON.parse(received_msg))
        }
    };
    ws.onerror = function()
    { 
        // 链接错误 websocket
        if(options.error){
          options.error()
        }
        console.log('链接不上')
    };
        
    ws.onclose = function()
    { 
        // 关闭 websocket
        if(options.close){
          options.close()
        }
        console.log('服务端关闭')
    };
    return ws;
  }
  else{
    alert('创建ws失败！')
  }
}