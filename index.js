const TelegramBot = require('node-telegram-bot-api')
const { MongoClient } = require('mongodb')
require('dotenv').config()

const admin_list = [1139700949]

const bot = new TelegramBot( process.env.TOKEN, {polling: true})
const client = new MongoClient (process.env.URI);
const times = client.db('shitposting').collection('user_timings')
const messages = client.db('shitposting').collection('messages')

async function write_msg_to_db  (msg, user_id) {
    await messages.insertOne({
        text: msg,
        ID: user_id,
    })
}

async function find_msgs(user_id){
    msgs = messages.find({ID : user_id})
    for await (const doc of msgs) {
      console.dir(doc);
    }
    return msgs
}

async function create_user(user_id, cur_time, nick_name, user_name){
    await times.insertOne({
        ID : user_id,
        time: cur_time,
        username: user_name, 
        name: nick_name,
    })
}

async function get_user(user_id){
    const user = await times.findOne({ID: user_id})
    return user
}

async function get_user_by_name(user_name){
    const user = await times.findOne({username : user_name})
    return user
}

async function update_time(user_id){
    await times.updateOne({ID: user_id}, {
        $set : {time: Date.now()}
    })
}

async function finish() {
    await client.close()
}

let check_if_spam = (txt) => {
    return false
}

bot.onText(/\/start/, msg =>{
    get_user(msg.chat.id).then(user => {
        bot.sendMessage(msg.chat.id, 'Привет, это бот-предложка канала "MSU.shitposting", вы можете отправить любое текстовое сообщение либо файл с текстом (если в файле больше 8192 символов в посте будут отображены первые 4000 символов и файлик с оригиналом). Если ваше сообщение не покажется боту спамом, оно тут же появится в основном канале, в противном случае оно попадёт на модерацию. Приятного щитпостинга в нашем уютном комьюнити)')
        if (!user){
            create_user(msg.chat.id, Date.now() - process.env.DELAY * 1000, msg.chat.first_name)
        }
    })
})

bot.onText(/\/info/, msg => {
    if (admin_list.includes(msg.chat.id)){
        let cur_username = msg.text.split(' ')[1].replace(/@/, '')
        get_user_by_name(cur_username).then(user => {
            if (user){
                console.log(user.ID)
                find_msgs(user.ID).then(m => {
                    //console.log(m)
                })
            }
        })
    }
})

bot.onText(/\/moderation/, msg => {

})

bot.on("text", (res) => {
    if (!res.hasOwnProperty('entities')){
        console.log(res)
        bot.sendMessage(res.chat.id, `Любимый, спасибо за ${res.text}`)
    
        get_user(res.chat.id).then(user => {
            if (user) {
                if ((Date.now() - user.time) / 1000 >= process.env.DELAY){
                    bot.sendMessage("@shitposting_in_msu", res.text || res.caption)
                    update_time(res.chat.id)
                }
                else {
                 bot.sendMessage(res.chat.id, `Простите, но вы не можете публиковать посты чаще, чем раз в 1 минуту. Пожалуйста, подождите еще ${Math.floor(process.env.DELAY - (Date.now() - user.time) / 1000)} секунд.`)
                }
            }
            else{
                bot.sendMessage("@shitposting_in_msu", res.text || res.caption)
                create_user(res.chat.id, Date.now(), res.chat.first_name, res.chat.username)
            }
        }) 
        write_msg_to_db(res.text || res.caption, res.chat.id)
    }
})
