const TelegramBot = require('node-telegram-bot-api')
const { MongoClient } = require('mongodb')
require('dotenv').config()

const bot = new TelegramBot( process.env.TOKEN, {polling: true})
const client = new MongoClient (process.env.URI);
const times = client.db('shitposting').collection('user_timings')

async function write_msg_to_db  (msg, user) {
    const coll = client.db('shitposting').collection('test')
    await coll.insertOne({
        text: `${msg}`,
        user: `${user}`
    })
}

async function create_user(user_id, cur_time){
    await times.insertOne({
        ID : user_id,
        time: cur_time,
    })
}

async function get_time(user_id){
    const user = await times.findOne({ID: user_id})
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

bot.on("message", (res) => {
    console.log(res)
    bot.sendMessage(res.chat.id, `Любимый, спасибо за ${res.text}`)
    
    get_time(res.chat.id).then(user => {
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
            create_user(res.chat.id, Date.now())
        }
    }) 
       write_msg_to_db(res.text || res.caption, res.chat.first_name)
})
