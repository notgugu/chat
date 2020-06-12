import Vue from 'vue'
import Router from 'vue-router'

import ChatIndex from '@/views/chat/index'

Vue.use(Router)

export default new Router({
  mode: 'history',
  routes: [
    {
      path:'/',
      name: 'chat',
      component: ChatIndex,
    },

  ]
})