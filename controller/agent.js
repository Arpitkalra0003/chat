var models = require('../model/model.js');
var path = require('path');
var bodyParser = require('body-parser');



module.exports = function (app,io){
    app.use( bodyParser.json() );
    app.use(bodyParser.urlencoded({     
        extended: true
    }));
    
    app.get('/a',function(req,res){
        res.sendFile(path.resolve(__dirname+"/../views/index-1.html"));
    });
    
    app.post('/registera',function(req,res){
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader("Access-Control-Allow-Method","'GET, POST, OPTIONS, PUT, PATCH, DELETE'");
        var agent={
            "name":req.body.name,
            "handle":req.body.handle,
            "password":req.body.password,
            "phone":req.body.phone,
            "email":req.body.email,
        };
        console.log(agent);
        
        models.agent.findOne({"handle":req.body.handle},function(err,doc){
            if(err){
                res.json(err); 
            }
            if(doc == null){
                models.agent.create(agent,function(err,doc){
                    if(err) res.json(err);
                    else{
                        res.send("success");
                    }
                });
            }else{
                res.send("agent already found");
            }
        })
        
    });
    
    
    var handle=null;
    var private=null;
    var agents={};
    var keys={};
    
    app.post('/logina',function(req,res){
        console.log(req.body.handle);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader("Access-Control-Allow-Method","'GET, POST, OPTIONS, PUT, PATCH, DELETE'");
        handle = req.body.handle;
        models.agent.findOne({"handle":req.body.handle, "password":req.body.password},function(err,doc){
            if(err){
                res.send(err); 
            }
            if(doc==null){
                res.send("agent has not registered");
            }
            else{
                console.log("Asas"+__dirname);
//                res.sendFile(path.resolve(__dirname+"/../views/chat1.html"));
                res.send("success");
            }
            
    });
    });
    
    io.on('connection',function(socket){
        console.log("Connection :agent is connected  "+handle);
        console.log("Connection : " +socket.id);
        io.to(socket.id).emit('handle', handle);
        agents[handle]=socket.id;
        keys[socket.id]=handle;
        console.log("agents list : "+agents);
        console.log("keys list : "+keys);
        models.agent.find({"handle" : handle},{friends:1,_id:0},function(err,doc){
            if(err){res.json(err);}
            else{
                friends=[];
                pending=[];
                all_friends=[];
                console.log("friends list: "+doc);
                list=doc[0].friends.slice();
                console.log(list);
                
                for(var i in list){
                    if(list[i].status=="Friend"){
                        friends.push(list[i].name);
                    }
                    else if (list[i].status=="Pending"){
                        pending.push(list[i].name);
                    }
                    else{
                        continue;
                    }
                }
                console.log("pending list: "+pending);
                console.log("friends list: "+friends);
                io.to(socket.id).emit('friend_list', friends);
                io.to(socket.id).emit('pending_list', pending);
                io.emit('agents',agents);
            }
        });
        
        
        socket.on('group message',function(msg){
            console.log(msg);
            io.emit('group',msg);
        });
        
        socket.on('private message',function(msg){
            console.log('message  :'+msg.split("#*@")[0]);
            models.messages.create({
                "message":msg.split("#*@")[1],
                "sender" :msg.split("#*@")[2],
                "reciever":msg.split("#*@")[0],
                "date" : new Date()});
            io.to(agents[msg.split("#*@")[0]]).emit('private message', msg);
        });
        
        socket.on('disconnect', function(){
            delete agents[keys[socket.id]];
            delete keys[socket.id];
            io.emit('agents',agents);
            console.log(agents);
        });
    });
    
    app.post('/friend_request',function(req,res){
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader("Access-Control-Allow-Method","'GET, POST, OPTIONS, PUT, PATCH, DELETE'");
        friend=true;
        models.agent.find({"handle" : req.body.my_handle,"friends.name":req.body.friend_handle},function(err,doc){
            if(err){res.json(err);}
            else if(doc.length!=0){
                console.log("Friend request : "+doc.length);
                console.log("Friend request : friend request already sent "+doc);
                res.send("Friend request already sent ");
            }
            else{
                console.log("Friend request : "+doc.length);
                models.agent.update({
                    handle:req.body.my_handle
                },{
                    $push:{
                        friends:{
                            name: req.body.friend_handle,
                            status: "Pending"
                        }
                    }
                },{
                    upsert:true
                },function(err,doc){
                    if(err){res.json(err);}
                    //            else{
                    //                console.log(doc);
                    //            }
                });
                io.to(agents[req.body.friend_handle]).emit('message', req.body);
            }
        });
    });
    
    app.post('/friend_request/confirmed',function(req,res){
        console.log("friend request confirmed : "+req.body);
        if(req.body.confirm=="Yes"){
            models.agent.find({
                "handle" : req.body.friend_handle,
                "friends.name":req.body.my_handle
            },function(err,doc){
                if(err){
                    res.json(err);
                }
                else if(doc.length!=0){
                    console.log("Friend request confirmed : "+doc.length);
                    console.log("Friend request confirmed : friend request already sent "+doc);
                    res.send("Friend request already accepted");
                }
                else{
                    models.agent.update({
                        "handle":req.body.my_handle,
                        "friends.name":req.body.friend_handle
                    },{
                        '$set':{
                            "friends.$.status":"Friend"
                        }
                    },function(err,doc){
                        if(err){res.json(err);}
                        else{

                            console.log("friend request confirmed : Inside yes confirmed");
                            io.to(agents[req.body.friend_handle]).emit('friend', req.body.my_handle);
                            io.to(agents[req.body.my_handle]).emit('friend', req.body.friend_handle);
                        }
                    });
                    models.agent.update({
                        handle:req.body.friend_handle
                    },{
                        $push:{
                            friends:{
                                name: req.body.my_handle,
                                status: "Friend"
                            }
                        }
                    },{upsert:true},function(err,doc){
                        if(err){res.json(err);}
                        //            else{
                        //                console.log(doc);
                        //            }
                    });
                }
            });
        }
        else{
            
            console.log("friend request confirmed : Inside No confirmed");
            models.agent.update({
                "handle":req.body.my_handle
            },{
                '$pull':{
                    'friends':{
                        "name":req.body.friend_handle,
                    }
                }
            },function(err,doc){
            if(err){res.json(err);}
            else{
                console.log("No");
            }
        });
        }
    });
    
}