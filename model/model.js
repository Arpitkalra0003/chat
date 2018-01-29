var mongoose = require('mongoose');

var Schema = mongoose.Schema;

mongoose.connect("mongodb://admin:admin@ds217898.mlab.com:17898/chat");

mongoose.connection.on('open', function (ref) {
    console.log('Connected to mongo server.');
});
mongoose.connection.on('error', function (err) {
    console.log('Could not connect to mongo server!');
    console.log(err);
});


module.exports.user=mongoose.model('User',new Schema({
    name:String,
    handle: String,
    password: String,
    phone:String,
    email:String,
    friends:[]
},{strict: false}));
module.exports.online=mongoose.model('online',new Schema({
    handle:String,
    connection_id:String
}));
module.exports.messages=mongoose.model('message',new Schema({
    message : String,
    sender  : String,
    reciever: String,
    date    : Date
}));
