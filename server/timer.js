var schedule = require('node-schedule');
var asyncLoop = require('node-async-loop');
var axios = require('axios');
var nodemailer = require('nodemailer');
const db = require('../db')
const AccessToken = db.model('accessToken');
const User = db.model('users');
const Expenses = db.model('expense')
const plaid = require('plaid')
const envvar = require('envvar')
var giphy = require('giphy-api')();
const PLAID_CLIENT_ID = require('../newCredentials').PLAID_CLIENT_ID
const PLAID_SECRET = require('../newCredentials').PLAID_SECRET
const PLAID_PUBLIC_KEY = require('../newCredentials').PLAID_PUBLIC_KEY
const PLAID_ENV = envvar.string('PLAID_ENV', 'development')
const client = new plaid.Client(
  PLAID_CLIENT_ID,
  PLAID_SECRET,
  PLAID_PUBLIC_KEY,
  plaid.environments[PLAID_ENV]
)

var j = schedule.scheduleJob('27 * * * *', function(){
  console.log('Please work????')
  console.log('client', client)
  AccessToken.findAll({include: [
    {model: User, include: [
      {model: Expenses}
    ]}
  ]}
  ).then((tokens)=> {
  	console.log('token?',tokens.length)
  asyncLoop(tokens, function (token, next){
  	client.getTransactions(token.accessToken, '2017-06-01','2017-06-30' , {
    count: 250,
    offset: 0,
  }, function (error, transactionsResponse) {
    console.log('immediate i')
    if (error != null) {
      console.log(JSON.stringify(error))
      return 'error'
    }
    var keyword = '';
    console.log('i before budget!')
    if(token.user.budgetUpdates==='ON'){
      var budget = (+token.user.expense.food)+(+token.user.expense.bills)+(+token.user.expense.healthcare)+(+token.user.expense.transportation)+
      (+token.user.expense.education)+(+token.user.expense.emergencies)+(+token.user.expense.entertainment)+(+token.user.expense.other);

      var totalSum = transactionsResponse.transactions.reduce((total,val)=>{
        if(val.amount>0)
          return total+val.amount;
        else return total
      },0)
      var budgetStr = (budget>=totalSum) ? `${token.user.name} was under budget!` : `${token.user.name} was over budget!`
      console.log('BUDGET',budget)
      console.log('totalSum',totalSum)
   }
   else{
      var budgetStr = '';
   }

    //console.log('Transactions:',transactionsResponse)
    //console.log('pulled ' + transactionsResponse.transactions.length + ' transactions')
    if(token.user.prodUpdates==='ON'&&token.user.thing!==null){
    var total = transactionsResponse.transactions.reduce((total,val)=>{
    	if(val.name===token.user.thing)
    		return total+val.amount;
    	else return total
    },0)
    console.log('total!',token.user.thing,total,token.user.amount)
    var message = (total<token.user.amount) ? `${token.user.name} did not overspend on ${token.user.thing}!` : `${token.user.name} overspent on ${token.user.thing}!`
    keyword = token.user.thing;
  }
  else{
    var message = ''
  }
  if(keyword==='' && token.user.budgetUpdates==='ON')
    keyword = (budget>=totalSum)? 'success' : 'failure'
    //console.log(total,typeof total);
    //console.log(total, token[0].user.thing )
    //var message = (total<token[0].user.amount) ? `${token[0].user.name} was successful!` : `${token[0].user.name} was unsuccessful!`
    //var second = `${token[0].user.name} spent ${total} on ${token[0].user.thing} - goal was ${token[0].user.amount}`
    //var fin = message + " "+second;
  var totalMessage = budgetStr+' '+message
  if(totalMessage!==" "){
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // secure:true for port 465, secure:false for port 587
      auth: {
        user: 'mercurybudget@gmail.com',
        pass: 'isteamgoodwith'
      }
    })

    // setup email data with unicode symbols
    // let mailOptions = {
    //   from: '"Fred Foo bread junior 👻" <*****@gmail.com>', // sender address
    //   to: 'ninbaratwli@gmail.com', // list of receivers
    //   subject: 'Hello ✔', // Subject line
    //   text: 'got bread ?', // plain text body
    //   html: '<b>got bread  ?</b>' // html body
    // }
    //console.log('to pass:',token[0].user.thing )
    giphy.search(keyword) // 'flamingo is a keyword to search for
		.then(function (data) {
    // Res contains gif data!
    //console.log('found a gif!!!')
    //console.log('HAS A THING??',data.data[0])
    var length = data.data.length;
    var chosen = data.data[Math.floor(length*Math.random())]
    var mailOptions = {
        from: '"Mercury" <mercurybudget@gmail.com>', // sender address
      to: token.user.emails.join(', '), // list of receivers
      subject: totalMessage,
      text: '',
    html: '<img src="cid:lets"/>',
    attachments: [{
        filename: 'image.gif',
        path: chosen.images.downsized.url,
        cid: 'lets' //same cid value as in the html img src
    }]
}
    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log(error);
      }
      console.log('Message %s sent: %s', info.messageId, info.response);
      /*req.end()
      transporter.close()
      res.send('WHYYYYYY')*/
    }) //closes sendmail
    }).catch((error)=>console.log(error)) //closes giphy
  }//closes if total message is not null
})//closes transactions
next()
},function (err)
{
    if (err)
    {
        console.error('Error: ' + err.message);
        return;
    }

    console.log('Finished!');
})
  })//closes token
  })//closes timer


module.exports = j;
