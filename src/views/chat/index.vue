<template>
<div class="chat-tool">
        <div class="chat-users" v-show="!isChatPrivate">
            <a @click.stop.prevent="chatWithSomeOne(item.key,item.name,item)" v-for="(item,index) in userNewMsgCountData" :key="index" v-show="item.key != key">{{ item.name }} {{item.count != null && item.count > 0 ? item.count : ''}}</a>
        </div>
        <div class="back" v-show="isChatPrivate"><span @click="isChatPrivate = false;">&lt;</span></div>
        <h3 class="title" v-show="!isChatPrivate">一起来聊天 - [ {{name}} ]</h3>
        <h3 class="title" v-show="isChatPrivate">[{{otherName}}] - [ {{name}} ]</h3>
        <div>
          <div class="chat-wrap" v-show="!isChatPrivate" ref="groupChatNode"> 
            <!--type = 1 自己的数据，2别人的数据， 3进入提示， 4离开提示-->
            <template  v-for="(item,index) in listData">
                <div v-if="item.type == 1 || item.type == 2" class="chat-list" :class="{'chat-mine': item.type == 1}"  :key="index">
                    <img class="chat-list-head" :src="item.imgHead" alt="">
                    <div class="chat-list-main">
                        <div class="chat-list-name">{{ item.name }} {{ item.time }}</div>
                        <div class="chat-list-content" v-html="item.msg"></div>
                    </div>
                </div>
                <div v-else class="chat-prompt" :key="index"><span>{{ item.name }} {{item.type == 3 ? '进入':'离开'}}本群聊</span></div>
            </template>
          </div>
          <div class="chat-wrap"  v-show="isChatPrivate" ref="privateChatNode">
              <template  v-for="(item,index) in chatPrivateData">
                  <div class="chat-list" :class="{'chat-mine': item.type == 1}"  :key="index" v-show="isOther(item)">
                      <img class="chat-list-head" :src="item.imgHead" alt="">
                      <div class="chat-list-main">
                          <div class="chat-list-name">{{ item.name }} {{ item.time }}</div>
                          <div class="chat-list-content" v-html="item.msg"></div>
                      </div>
                  </div>
              </template>
          </div>
        </div>
        
        <div class="chat-editor">
            <!-- <div class="chat-editor-content" placeholder="请输入内容" contenteditable="true" ref="divNode"></div> -->
            <ueditor v-model.trim="value" id="news-add" :options="{
                toolbars: [
                    ['emotion']
                ]
            }" ref="ueditor"></ueditor>
            <button class="chat-editor-btn" @click="submit()">发送</button>
        </div>
    </div>
</template>

<script>
import { ws } from '@/utils/ws'

export default {
  data () {
    return {
      wsObj: null,//ws对象
      name:'',//自己的name
      key: '',//自己的key
      value: '',//聊天输入框的值
      imgHead: null,//头像
      listData: [],//群聊消息和进出提示
      userData: [],//所有用户的数据
      userNewMsgCountData: [],//给除了自己的用户增加了私聊消息数目的数据
      isChatPrivate: false,//是否是处于私聊
      chatPrivateData: [],//私聊消息
      otherName: '',//当前私聊对象的name
      otherKey: '',//当前私聊对象的key
    }
  },
  created(){
   let name = window.prompt('请输入您的姓名');//匿名随机产生昵称
   name = name == null || '' ? '匿名'+ String(Math.random()).slice(3,7): name;
   this.name = name;
   this.wsObj = ws({
       success: (data)=>{//接收到服务器消息时触发
          if(data.event == 'groupChat/users'){
            this.userData = data.data;
            for(let i of this.userData){//第一个用户直接添加
              let count = 0;
              if(this.userNewMsgCountData.length == 0){
                i.count = 0;
                this.userNewMsgCountData.push(i);
                continue;
              };
              
              for(let j of this.userNewMsgCountData){//防止重复添加
                if(i.key != j.key){
                  count++;
                  if(count >= this.userNewMsgCountData.length){
                    i.count = 0;
                    this.userNewMsgCountData.push(i);
                    break;
                  }
                }
              }
            }
          }
          else if(data.event == 'groupChat' || data.event == 'groupChat/status'){
            if(data.data.id != null){//增加自己的key
              this.key = data.data.key;
              return;
            }
            this.listData.push(data.data);
          }
        
          else if(data.event == 'privateChat'){//私聊接口
            this.chatPrivateData.push(data.data);
            for(let i of this.userNewMsgCountData){
              if(i.key == data.data.key && data.data.type == 2 && this.isChatPrivate == false){//增加消息数目
                i.count++;
              }
            }
          }
          else if(data.event == 'groupChat/close'){//链接中断
            this.listData.push(data.data);
            for(let i of this.userNewMsgCountData){
              if(i.key == data.data.key){
                this.userNewMsgCountData.splice(data.data.index,1);
                break;
              }
            }
          }
        
        
       },
       open(ws){//打开websocket链接成功后触发一次
           ws.sendJson({
                event: 'groupChat/status',//ws接口名
                data: {
                    name,
                    type: 3,//进入,
                    imgHead: this.imgHead
                }
            })
       }
   })

   this.imgHead = this.randomHeadName();

  },
  destroyed(){
    ws.sendJson({
      event: 'groupChat/status',//ws接口名
      data: {
          name,
          type: 4,//离开
          imgHead: this.imgHead
      }
    })
  },
  methods: {

    isOther(item){//判断消息来源来决定是否显示
      console.log(item.name == this.otherName)
      if(item.key == this.otherKey){
        return true;
      }
      else{
        return false;
      }
    },
   randomHeadName(){//产生随机头像
     let num = Math.floor(Math.random()*51);
     num = num < 10 ? '0'+num : num;
     let name =  String(num);
     return `/static/face/i_f${name}.gif`
   },
   submit(){//提交消息到后台
       let msg = this.value
       if(this.isChatPrivate == false){
        this.wsObj.sendJson({
           event: 'groupChat',//ws接口名
           data: {
               msg,
               name: this.name,
               imgHead: this.imgHead
           }
        })
       }
       else{
        this.wsObj.sendJson({
           event: 'privateChat',//ws接口名
           data: {
               msg,
               name: this.name,
               key: this.otherKey,
               imgHead: this.imgHead
           }
         })
       }
       
       this.value = '';
       console.log(this.userNewMsgCountData)
   },
   chatWithSomeOne(key,name,item){
       //与人单独聊天
       this.isChatPrivate = true;
       this.otherName = name;
       this.otherKey = key;
       item.count = 0;
   }
  },
  watch:{
    listData(){
      this.$nextTick(() => {//确保dom更新后执行下面的代码
        this.$refs.groupChatNode.scrollTop = this.$refs.groupChatNode.scrollHeight; // 将页面卷到底部
      })
    },
    chatPrivateData(){
      this.$nextTick(() => {
        this.$refs.privateChatNode.scrollTop = this.$refs.privateChatNode.scrollHeight; // 将页面卷到底部
      });
    },
    isChatPrivate(){//点入私聊时，默认显示最下面的消息
      this.$nextTick(() => {
        this.$refs.privateChatNode.scrollTop = this.$refs.privateChatNode.scrollHeight; // 将页面卷到底部
      });
    }
  },
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.chat-tool{position: relative;  width: 498px; background: #fff; margin: 0 auto;}
.chat-tool .title{ line-height: 35px; background-color: #074775; font-size: 14px; 
padding-left:5px; border:#002d61 1px solid; color:#fff; font-weight: normal;}
.chat-wrap{ height: 335px; padding-bottom: 10px; box-sizing: border-box; overflow-y: auto;}
.chat-prompt{ text-align: center;}
.chat-prompt span{display: inline-block; margin-top: 10px; padding: 0 8px; 
background-color: #eff3f6; border-radius: 3px; color: #a3b0b9;}
.chat-list{ display: flex; margin-top: 16px; width: 430px;}
.chat-list-head{ width: 40px; height: 40px; margin: 0 5px 0 8px;}
.chat-list-name{ height: 21px; line-height: 18px; padding-left: 3px;
  color: #6e8096;}
.chat-list-content{ width: 380px; padding: 10px 6px; box-sizing: border-box; border-radius: 8px;
background-color: #eee; line-height: 18px;}
.chat-mine{ margin-left: 51px;}
.chat-mine .chat-list-head{ order: 2;}
.chat-mine .chat-list-main{ order: 1;}
.chat-mine .chat-list-name{text-align: right; }
.chat-mine .chat-list-content{ background:#f8ec0c;}
.chat-icon{height: 34px; line-height: 34px; border-top:solid 1px #e9eef2;border-bottom:solid 1px #e9eef2;}
.chat-icon .face{display: inline-block; width: 16px; height: 16px; border-radius: 50%; 
background-color: #000; vertical-align: middle; margin-left: 10px;}
.chat-editor{ height: 108px;}
.chat-editor-content{ width: 478px; height: 60px; line-height: 18px; margin: 4px 0 0 7px; overflow-y: auto;}
.chat-editor-btn{ float:right; margin-right: 8px; width: 52px; height: 25px; border: 0; background-color: #90c4f4;
border-radius: 3px; font-size: 14px; color: #fff; margin-top: 8px;}
.chat-editor-content:empty:before{
    content:attr(placeholder);
    font-size: 13px;
    color: #999;
}
.chat-editor-content:focus:before{
    content:none;
}
.chat-editor-content:focus{ outline: none;}
.chat-users{ position: absolute; left: -200px; height: 100%; overflow-y: auto; width: 200px; padding: 10px; box-sizing: border-box; }
.chat-users a{ display: block;margin-right: 10px; color: blue; cursor: pointer; text-decoration: underline; text-align: center;}
.back{position: absolute; font-size: 26px; left:-150px; top: -20px;}
</style>
